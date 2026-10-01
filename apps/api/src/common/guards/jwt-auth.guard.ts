import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Role } from '@prisma/client';
import type { Request } from 'express';
import type { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from '../types/auth-user';

/**
 * Guard global de autenticaciÃ³n (JWT).
 * Los endpoints marcados con `@Public()` se saltan la comprobaciÃ³n.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  override handleRequest<TUser = AuthUser>(err: Error | null, user?: TUser): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Debes iniciar sesiÃ³n para acceder a este recurso');
    }
    return user;
  }
}

/**
 * Guard global de autorizaciÃ³n por rol: comprueba los roles declarados
 * con `@Roles(...)`. Devuelve 403 si el rol no estÃ¡ permitido.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Debes iniciar sesiÃ³n para acceder a este recurso');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `No tienes permisos para esta acciÃ³n. Roles permitidos: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
