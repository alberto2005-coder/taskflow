import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthUser } from '../types/auth-user';

/**
 * Inyecta el usuario autenticado de la peticiÃ³n actual.
 *
 * @example
 * @Get('me')
 * getMe(@CurrentUser() user: AuthUser) {}
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | undefined =>
    context.switchToHttp().getRequest<{ user?: AuthUser }>().user,
);
