import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Prisma, Task, User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import type { AuthUser } from '../common/types/auth-user';
import {
  canChangeTaskStatus,
  canComment,
  canEditTask,
  canManageProject,
  canManageTasks,
  canViewProject,
  taskVisibilityWhere,
} from '../users/permissions';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { ListTasksDto } from './dto/list-tasks.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';

type UserSummary = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>;

export interface TaskSummary {
  id: string;
  title: string;
  description: string | null;
  status: Task['status'];
  priority: Task['priority'];
  createdAt: Date;
  updatedAt: Date;
  project: { id: string; name: string };
  assignee: UserSummary | null;
  commentsCount: number;
}

export interface CommentSummary {
  id: string;
  content: string;
  author: UserSummary;
  createdAt: Date;
  updatedAt: Date;
}

/** Tarea con los datos internos necesarios para evaluar permisos. */
interface TaskWithContext {
  id: string;
  title: string;
  description: string | null;
  status: Task['status'];
  priority: Task['priority'];
  createdAt: Date;
  updatedAt: Date;
  assigneeId: string | null;
  assignee: UserSummary | null;
  project: {
    id: string;
    name: string;
    ownerId: string;
    members: { userId: string }[];
  };
  _count: { comments: number };
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Listado de tareas visibles con filtros por estado, responsable y proyecto. */
  async findAll(user: AuthUser, query: ListTasksDto): Promise<PaginatedResult<TaskSummary>> {
    // Un MEMBER solo ve sus propias tareas, aunque pida otro responsable
    const assigneeId = user.role === Role.MEMBER ? user.id : query.assigneeId;

    const where: Prisma.TaskWhereInput = {
      ...taskVisibilityWhere(user),
      ...(query.status ? { status: query.status } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
    };

    const [total, tasks] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: this.taskSelect,
      }),
    ]);

    return paginate(
      tasks.map((task) => this.toSummary(task)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(user: AuthUser, id: string): Promise<TaskSummary> {
    const task = await this.loadTask(id);

    if (!this.canSee(user, task)) {
      throw new NotFoundException('Tarea no encontrada');
    }

    return this.toSummary(task);
  }

  /** Crea una tarea en un proyecto (ADMIN o MANAGER propietario). */
  async create(user: AuthUser, projectId: string, dto: CreateTaskDto): Promise<TaskSummary> {
    const project = await this.loadProject(projectId);

    if (!canManageTasks(user, project)) {
      throw new ForbiddenException('No tienes permisos para crear tareas en este proyecto');
    }

    this.assertAssigneeBelongsToProject(dto.assigneeId, project);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status ?? 'TODO',
        priority: dto.priority ?? 'MEDIUM',
        projectId,
        assigneeId: dto.assigneeId ?? null,
      },
      select: this.taskSelect,
    });

    return this.toSummary(task);
  }

  async update(user: AuthUser, id: string, dto: UpdateTaskDto): Promise<TaskSummary> {
    const task = await this.loadTask(id);
    const project = this.projectPermissions(task);

    if (!canEditTask(user, task, project)) {
      throw new ForbiddenException('No tienes permisos para editar esta tarea');
    }

    // Solo ADMIN/MANAGER propietario pueden reasignar la tarea
    if (dto.assigneeId !== undefined && !canManageProject(user, project)) {
      throw new ForbiddenException('Solo un gestor o administrador puede reasignar tareas');
    }

    if (dto.assigneeId !== undefined) {
      this.assertAssigneeBelongsToProject(dto.assigneeId, this.projectPermissions(task));
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
      },
      select: this.taskSelect,
    });

    return this.toSummary(updated);
  }

  /** Cambia el estado (`TODO` â†’ `IN_PROGRESS` â†’ `DONE`). */
  async updateStatus(user: AuthUser, id: string, status: Task['status']): Promise<TaskSummary> {
    const task = await this.loadTask(id);
    const project = this.projectPermissions(task);

    if (!canChangeTaskStatus(user, task, project)) {
      throw new ForbiddenException('No tienes permisos para cambiar el estado de esta tarea');
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status },
      select: this.taskSelect,
    });

    return this.toSummary(updated);
  }

  async remove(user: AuthUser, id: string): Promise<void> {
    const task = await this.loadTask(id);

    if (!canManageTasks(user, this.projectPermissions(task))) {
      throw new ForbiddenException('No tienes permisos para eliminar esta tarea');
    }

    await this.prisma.task.delete({ where: { id } });
  }

  async findComments(user: AuthUser, id: string): Promise<CommentSummary[]> {
    const task = await this.loadTask(id);

    if (!canComment(user, this.projectPermissions(task))) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const comments = await this.prisma.comment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: userSelect },
      },
    });

    return comments;
  }

  async addComment(user: AuthUser, id: string, dto: CreateCommentDto): Promise<CommentSummary> {
    const task = await this.loadTask(id);
    const project = this.projectPermissions(task);

    if (!canComment(user, project)) {
      throw new NotFoundException('Tarea no encontrada');
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content.trim(),
        taskId: id,
        authorId: user.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: userSelect },
      },
    });

    return comment;
  }

  // ---------------------------------------------------------
  // Privados
  // ---------------------------------------------------------

  private readonly taskSelect = {
    id: true,
    title: true,
    description: true,
    status: true,
    priority: true,
    createdAt: true,
    updatedAt: true,
    assigneeId: true,
    assignee: { select: userSelect },
    project: {
      select: {
        id: true,
        name: true,
        ownerId: true,
        members: { select: { userId: true } },
      },
    },
    _count: { select: { comments: true } },
  } satisfies Prisma.TaskSelect;

  private async loadTask(id: string): Promise<TaskWithContext> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: this.taskSelect,
    });

    if (!task) throw new NotFoundException('Tarea no encontrada');

    return task as TaskWithContext;
  }

  private async loadProject(projectId: string): Promise<{
    ownerId: string;
    memberIds: string[];
  }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        members: { select: { userId: true } },
      },
    });

    if (!project) throw new NotFoundException('Proyecto no encontrado');

    return { ownerId: project.ownerId, memberIds: project.members.map((m) => m.userId) };
  }

  private projectPermissions(task: TaskWithContext): {
    ownerId: string;
    memberIds: string[];
  } {
    return {
      ownerId: task.project.ownerId,
      memberIds: task.project.members.map((member) => member.userId),
    };
  }

  private canSee(user: AuthUser, task: TaskWithContext): boolean {
    return canViewProject(user, this.projectPermissions(task));
  }

  private assertAssigneeBelongsToProject(
    assigneeId: string | undefined,
    project: { ownerId: string; memberIds: string[] },
  ): void {
    if (!assigneeId) return;

    const belongs = assigneeId === project.ownerId || project.memberIds.includes(assigneeId);

    if (!belongs) {
      throw new BadRequestException('El responsable debe ser un miembro del proyecto');
    }
  }

  private toSummary(task: TaskWithContext): TaskSummary {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      project: { id: task.project.id, name: task.project.name },
      assignee: task.assignee,
      commentsCount: task._count.comments,
    };
  }
}
