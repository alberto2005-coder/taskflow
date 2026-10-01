import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { dbSuite } from './setup/db';
import { bearer, register } from './utils';

const describeWithDb = dbSuite();

describeWithDb('Auth · integración', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.cleanDatabase();
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  it('GET /api/health responde sin autenticación', async () => {
    const response = await http().get('/api/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('POST /api/auth/register crea el usuario y devuelve los tokens', async () => {
    const response = await http()
      .post('/api/auth/register')
      .send({ name: 'Ana García', email: 'ana@taskflow.dev', password: 'Secreta123' })
      .expect(201);

    expect(response.body.user).toMatchObject({
      email: 'ana@taskflow.dev',
      role: 'MEMBER',
      name: 'Ana García',
    });
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('POST /api/auth/register rechaza un email duplicado (409)', async () => {
    await http()
      .post('/api/auth/register')
      .send({ name: 'Ana 2', email: 'ana@taskflow.dev', password: 'Secreta123' })
      .expect(409);
  });

  it('POST /api/auth/register valida el DTO (400)', async () => {
    const response = await http()
      .post('/api/auth/register')
      .send({ name: 'A', email: 'no-es-un-email', password: 'corta' })
      .expect(400);

    expect(Array.isArray(response.body.message)).toBe(true);
  });

  it('POST /api/auth/login devuelve 401 con credenciales inválidas', async () => {
    await http()
      .post('/api/auth/login')
      .send({ email: 'ana@taskflow.dev', password: 'incorrecta' })
      .expect(401);

    await http()
      .post('/api/auth/login')
      .send({ email: 'nadie@taskflow.dev', password: 'Secreta123' })
      .expect(401);
  });

  it('GET /api/auth/me exige token y devuelve el usuario', async () => {
    await http().get('/api/auth/me').expect(401);

    const session = await register(app, {
      name: 'Berta',
      email: 'berta@taskflow.dev',
      password: 'Secreta123',
    });

    const response = await http().get('/api/auth/me').set(bearer(session.accessToken)).expect(200);

    expect(response.body).toMatchObject({ email: 'berta@taskflow.dev', id: session.userId });
  });

  it('POST /api/auth/refresh rota el token y revoca el anterior', async () => {
    const session = await register(app, {
      name: 'Carlos',
      email: 'carlos@taskflow.dev',
      password: 'Secreta123',
    });

    const refreshed = await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(200);

    expect(refreshed.body.refreshToken).not.toBe(session.refreshToken);

    // El token antiguo ya no sirve
    await http().post('/api/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);

    // El nuevo sí
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(200);
  });

  it('POST /api/auth/logout revoca el refresh token (204)', async () => {
    const session = await register(app, {
      name: 'Diana',
      email: 'diana@taskflow.dev',
      password: 'Secreta123',
    });

    await http().post('/api/auth/logout').send({ refreshToken: session.refreshToken }).expect(204);

    await http().post('/api/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
  });

  it('el access token caducado/inválido devuelve 401', async () => {
    await http().get('/api/auth/me').set(bearer('token-falso')).expect(401);
  });
});
