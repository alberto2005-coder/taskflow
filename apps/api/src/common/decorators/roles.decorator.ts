import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

/** Clave de metadatos que guarda los roles permitidos en un endpoint. */
export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a los roles indicados.
 * La comprobación la hace `RolesGuard`; siempre se valida en el backend.
 *
 * @example
 * @Roles(Role.ADMIN)
 * @Get('users') findAll() {}
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
