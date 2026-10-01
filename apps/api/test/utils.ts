import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../src/prisma/prisma.service';

export interface Session {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

export interface AuthBody {
  user: { id: string; email: string; name: string; role: string };
  accessToken: string;
  refreshToken: string;
}

/** Cabecera de autorizaciÃ³n para las peticiones autenticadas. */
export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Registra un usuario y devuelve su sesiÃ³n. */
export async function register(
  app: INestApplication,
  data: { name: string; email: string; password: string },
): Promise<Session> {
  const response = await request(app.getHttpServer()).post('/api/auth/register').send(data);

  if (response.status !== 201) {
    throw new Error(`No se pudo registrar ${data.email}: ${response.status} ${response.text}`);
  }

  const body = response.body as AuthBody;
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: body.user.id,
    email: body.user.email,
  };
}

/** Inicia sesiÃ³n y devuelve la sesiÃ³n. */
export async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<Session> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(`No se pudo iniciar sesiÃ³n con ${email}: ${response.status}`);
  }

  const body = response.body as AuthBody;
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: body.user.id,
    email: body.user.email,
  };
}

/** Crea un usuario y le asigna un rol directamente en la base de datos. */
export async function createSessionWithRole(
  app: INestApplication,
  prisma: PrismaService,
  input: { name: string; email: string; password: string },
  role: 'ADMIN' | 'MANAGER' | 'MEMBER',
): Promise<Session> {
  await register(app, input);

  await prisma.user.update({ where: { email: input.email }, data: { role } });

  // El JWT sigue llevando el rol antiguo, asÃ­ que se vuelve a iniciar sesiÃ³n
  return login(app, input.email, input.password);
}
