import type { Role } from '@prisma/client';

/** Usuario autenticado disponible en `request.user` tras el JWT. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
