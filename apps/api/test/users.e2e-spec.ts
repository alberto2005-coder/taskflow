import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { dbSuite } from './setup/db';
import { bearer, createSessionWithRole, Session } from './utils';

const describeWithDb = dbSuite();

describeWithDb('Usuarios Â· integraciÃ³n (roles)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let admin: Session;
  let manager: Session;
  let member: Session;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.cleanDatabase();

    admin = await createSessionWithRole(
      app,
      prisma,
      { name: 'Alice Admin', email: 'admin@taskflow.dev', password: 'Secreta123' },
      'ADMIN',
    );
    manager = await createSessionWithRole(
      app,
      prisma,
      { name: 'Marco Manager', email: 'manager@taskflow.dev', password: 'Secreta123' },
      'MANAGER',
    );
    member = await createSessionWithRole(
      app,
      prisma,
      { name: 'Marta Member', email: 'member@taskflow.dev', password: 'Secreta123' },
      'MEMBER',
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  it('solo ADMIN lista los usuarios (403 para el resto)', async () => {
    await http().get('/api/users').set(bearer(manager.accessToken)).expect(403);
    await http().get('/api/users').set(bearer(member.accessToken)).expect(403);
    await http().get('/api/users').expect(401);

    const response = await http().get('/api/users').set(bearer(admin.accessToken)).expect(200);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.meta).toMatchObject({ page: 1, limit: 20, total: 3 });
    expect(response.body.items[0]).not.toHaveProperty('passwordHash');
  });

  it('ADMIN cambia el rol de un usuario', async () => {
    const response = await http()
      .patch(`/api/users/${member.userId}/role`)
      .set(bearer(admin.accessToken))
      .send({ role: 'MANAGER' })
      .expect(200);

    expect(response.body).toMatchObject({ role: 'MANAGER', id: member.userId });

    // Se devuelve al rol original para el resto de pruebas
    await http()
      .patch(`/api/users/${member.userId}/role`)
      .set(bearer(admin.accessToken))
      .send({ role: 'MEMBER' })
      .expect(200);
  });

  it('no se puede eliminar el Ãºltimo administrador', async () => {
    await http().delete(`/api/users/${admin.userId}`).set(bearer(admin.accessToken)).expect(403);
  });

  it('nadie puede eliminar su propia cuenta', async () => {
    // Se crea un admin extra para que el admin original no sea el Ãºltimo
    const secondAdmin = await createSessionWithRole(
      app,
      prisma,
      { name: 'Segundo Admin', email: 'admin2@taskflow.dev', password: 'Secreta123' },
      'ADMIN',
    );

    await http()
      .delete(`/api/users/${secondAdmin.userId}`)
      .set(bearer(secondAdmin.accessToken))
      .expect(403);

    await http().delete(`/api/users/${admin.userId}`).set(bearer(admin.accessToken)).expect(403);
  });

  it('un usuario solo puede editar su propio perfil', async () => {
    await http()
      .patch(`/api/users/${manager.userId}`)
      .set(bearer(member.accessToken))
      .send({ name: 'Nombre robado' })
      .expect(403);

    const own = await http()
      .patch(`/api/users/${member.userId}`)
      .set(bearer(member.accessToken))
      .send({ name: 'Marta Actualizada' })
      .expect(200);

    expect(own.body.name).toBe('Marta Actualizada');
  });

  it('valida el rol recibido (400)', async () => {
    await http()
      .patch(`/api/users/${member.userId}/role`)
      .set(bearer(admin.accessToken))
      .send({ role: 'SUPERVISOR' })
      .expect(400);
  });
});
