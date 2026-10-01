import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import type { ListUsersDto } from './dto/list-users.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

/** Forma pÃºblica de un usuario (nunca se expone `passwordHash`). */
export type UserPublic = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Listado paginado con bÃºsqueda por nombre/email y filtro de rol. */
  async findAll(query: ListUsersDto): Promise<PaginatedResult<UserPublic>> {
    const search = query.search?.trim();

    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: this.publicSelect,
      }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string): Promise<UserPublic> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: this.publicSelect });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    return user;
  }

  /** Cambia el rol de un usuario (solo ADMIN). */
  async updateRole(id: string, role: Role): Promise<UserPublic> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.role === Role.ADMIN && role !== Role.ADMIN) {
      await this.assertNotLastAdmin(id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: this.publicSelect,
    });

    return updated;
  }

  /** Actualiza nombre/email (el propio usuario o un ADMIN). */
  async update(id: string, dto: UpdateUserDto): Promise<UserPublic> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const email = dto.email?.trim().toLowerCase();

    if (email && email !== user.email) {
      const taken = await this.prisma.user.findUnique({ where: { email } });
      if (taken) throw new ConflictException('El email ya estÃ¡ registrado');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(email ? { email } : {}),
      },
      select: this.publicSelect,
    });

    return updated;
  }

  /** Borra un usuario: ni a sÃ­ mismo ni al Ãºltimo ADMIN. */
  async remove(id: string, currentUser: { id: string }): Promise<void> {
    if (id === currentUser.id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.role === Role.ADMIN) {
      await this.assertNotLastAdmin(id);
    }

    await this.prisma.user.delete({ where: { id } });
  }

  private readonly publicSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
  } as const;

  private async assertNotLastAdmin(excludeId: string): Promise<void> {
    const remaining = await this.prisma.user.count({
      where: { role: Role.ADMIN, id: { not: excludeId } },
    });

    if (remaining === 0) {
      throw new ForbiddenException('No se puede quitar el Ãºltimo administrador del sistema');
    }
  }
}
