import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Project, User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import type { AuthUser } from '../common/types/auth-user';
import { canManageProject, canViewProject, projectVisibilityWhere } from '../users/permissions';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { ListProjectsDto } from './dto/list-projects.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

type UserSummary = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>;

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: Project['status'];
  createdAt: Date;
  updatedAt: Date;
  owner: UserSummary;
  membersCount: number;
  tasksCount: number;
}

export interface ProjectDetail extends ProjectSummary {
  members: UserSummary[];
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Listado visible para el rol, con paginaciÃ³n, estado y bÃºsqueda. */
  async findAll(user: AuthUser, query: ListProjectsDto): Promise<PaginatedResult<ProjectSummary>> {
    const search = query.search?.trim();
    const visibility = projectVisibilityWhere(user);

    const where: Prisma.ProjectWhereInput = {
      ...(visibility ?? {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, projects] = await this.prisma.$transaction([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          owner: { select: userSelect },
          _count: { select: { members: true, tasks: true } },
        },
      }),
    ]);

    const items = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: project.owner,
      membersCount: project._count.members,
      tasksCount: project._count.tasks,
    }));

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(user: AuthUser, id: string): Promise<ProjectDetail> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
        owner: { select: userSelect },
        members: {
          orderBy: { joinedAt: 'asc' },
          select: { user: { select: userSelect } },
        },
        _count: { select: { members: true, tasks: true } },
      },
    });

    if (!project) throw new NotFoundException('Proyecto no encontrado');

    const memberIds = project.members.map((member) => member.user.id);

    if (!canViewProject(user, { ownerId: project.ownerId, memberIds })) {
      // No se revela la existencia de proyectos ajenos
      throw new NotFoundException('Proyecto no encontrado');
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: project.owner,
      members: project.members.map((member) => member.user),
      membersCount: project._count.members,
      tasksCount: project._count.tasks,
    };
  }

  async create(user: AuthUser, dto: CreateProjectDto): Promise<ProjectDetail> {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        ownerId: user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: userSelect },
        _count: { select: { members: true, tasks: true } },
      },
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: project.owner,
      members: [],
      membersCount: project._count.members,
      tasksCount: project._count.tasks,
    };
  }

  async update(user: AuthUser, id: string, dto: UpdateProjectDto): Promise<ProjectDetail> {
    await this.getManagedProject(user, id);

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    return this.findOne(user, updated.id);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    await this.getManagedProject(user, id);
    await this.prisma.project.delete({ where: { id } });
  }

  async addMember(user: AuthUser, id: string, userId: string): Promise<ProjectDetail> {
    const project = await this.getManagedProject(user, id);

    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('El usuario indicado no existe');

    const alreadyMember = project.members.some((member) => member.user.id === userId);
    if (alreadyMember) throw new ConflictException('El usuario ya es miembro del proyecto');

    await this.prisma.projectMember.create({ data: { projectId: id, userId } });

    return this.findOne(user, id);
  }

  async removeMember(user: AuthUser, id: string, userId: string): Promise<ProjectDetail> {
    await this.getManagedProject(user, id);

    await this.prisma.projectMember.deleteMany({ where: { projectId: id, userId } });

    return this.findOne(user, id);
  }

  /**
   * Carga el proyecto y comprueba que el usuario puede administrarlo.
   * Devuelve el proyecto con sus miembros (Ãºtil para las operaciones siguientes).
   */
  private async getManagedProject(
    user: AuthUser,
    id: string,
  ): Promise<{ members: { user: { id: string } }[] }> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: {
        ownerId: true,
        members: { select: { user: { select: { id: true } } } },
      },
    });

    if (!project) throw new NotFoundException('Proyecto no encontrado');

    const memberIds = project.members.map((member) => member.user.id);

    if (!canViewProject(user, { ownerId: project.ownerId, memberIds })) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (!canManageProject(user, { ownerId: project.ownerId, memberIds })) {
      throw new ForbiddenException('No tienes permisos para gestionar este proyecto');
    }

    return { members: project.members };
  }
}
