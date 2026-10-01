import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { dbSuite } from './setup/db';
import { bearer, createSessionWithRole, register, Session } from './utils';

const describeWithDb = dbSuite();

describeWithDb('Proyectos Â· integraciÃ³n', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let admin: Session;
  let manager: Session;
  let otherManager: Session;
  let member: Session;
  let outsider: Session;

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
    otherManager = await createSessionWithRole(
      app,
      prisma,
      { name: 'Otro Manager', email: 'otro@taskflow.dev', password: 'Secreta123' },
      'MANAGER',
    );
    member = await createSessionWithRole(
      app,
      prisma,
      { name: 'Marta Member', email: 'member@taskflow.dev', password: 'Secreta123' },
      'MEMBER',
    );
    outsider = await register(app, {
      name: 'Fernando ForÃ¡neo',
      email: 'fuera@taskflow.dev',
      password: 'Secreta123',
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  describe('POST /api/projects', () => {
    it('MEMBER no puede crear proyectos (403)', async () => {
      await http()
        .post('/api/projects')
        .set(bearer(member.accessToken))
        .send({ name: 'Proyecto prohibido' })
        .expect(403);
    });

    it('MANAGER crea un proyecto y es su propietario', async () => {
      const response = await http()
        .post('/api/projects')
        .set(bearer(manager.accessToken))
        .send({ name: 'RediseÃ±o de la web', description: 'React + Tailwind' })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'RediseÃ±o de la web',
        description: 'React + Tailwind',
        status: 'ACTIVE',
        membersCount: 0,
        tasksCount: 0,
      });
      expect(response.body.owner).toMatchObject({ email: 'manager@taskflow.dev' });
    });

    it('valida el nombre del proyecto (400)', async () => {
      await http()
        .post('/api/projects')
        .set(bearer(manager.accessToken))
        .send({ name: 'x' })
        .expect(400);
    });
  });

  describe('visibilidad y miembros', () => {
    let projectId: string;

    beforeAll(async () => {
      const response = await http()
        .post('/api/projects')
        .set(bearer(manager.accessToken))
        .send({ name: 'API pÃºblica', description: 'Swagger + JWT' })
        .expect(201);
      projectId = response.body.id as string;
    });

    it('un miembro no aÃ±adido no ve el proyecto (404)', async () => {
      await http().get(`/api/projects/${projectId}`).set(bearer(outsider.accessToken)).expect(404);

      const list = await http().get('/api/projects').set(bearer(outsider.accessToken)).expect(200);

      expect(list.body.items).toHaveLength(0);
    });

    it('el propietario aÃ±ade miembros y el listado lo refleja', async () => {
      const response = await http()
        .post(`/api/projects/${projectId}/members`)
        .set(bearer(manager.accessToken))
        .send({ userId: member.userId })
        .expect(201);

      expect(response.body.members).toHaveLength(1);
      expect(response.body.members[0]).toMatchObject({ email: 'member@taskflow.dev' });

      const asMember = await http()
        .get(`/api/projects/${projectId}`)
        .set(bearer(member.accessToken))
        .expect(200);

      expect(asMember.body.name).toBe('API pÃºblica');
    });

    it('no permite aÃ±adir al mismo miembro dos veces (409)', async () => {
      await http()
        .post(`/api/projects/${projectId}/members`)
        .set(bearer(manager.accessToken))
        .send({ userId: member.userId })
        .expect(409);
    });

    it('otro MANAGER no gestiona el proyecto ajeno (403)', async () => {
      // Visible para él (es miembro), pero no gestionable: solo el propietario o un ADMIN
      await http()
        .post(`/api/projects/${projectId}/members`)
        .set(bearer(manager.accessToken))
        .send({ userId: otherManager.userId })
        .expect(201);

      await http()
        .patch(`/api/projects/${projectId}`)
        .set(bearer(otherManager.accessToken))
        .send({ name: 'Nombre robado' })
        .expect(403);
    });

    it('ADMIN sÃ­ puede editar cualquier proyecto', async () => {
      await http()
        .patch(`/api/projects/${projectId}`)
        .set(bearer(admin.accessToken))
        .send({ description: 'Actualizado por el admin' })
        .expect(200);
    });

    it('el propietario puede archivar el proyecto', async () => {
      const response = await http()
        .patch(`/api/projects/${projectId}`)
        .set(bearer(manager.accessToken))
        .send({ status: 'ARCHIVED' })
        .expect(200);

      expect(response.body.status).toBe('ARCHIVED');
    });

    it('un miembro no puede quitar a otros (403)', async () => {
      await http()
        .delete(`/api/projects/${projectId}/members/${member.userId}`)
        .set(bearer(member.accessToken))
        .expect(403);
    });
  });

  describe('GET /api/projects', () => {
    it('pagina y filtra segÃºn el rol', async () => {
      const response = await http()
        .get('/api/projects?page=1&limit=10')
        .set(bearer(admin.accessToken))
        .expect(200);

      expect(response.body.meta).toMatchObject({ page: 1, limit: 10 });
      expect(response.body.meta.total).toBeGreaterThanOrEqual(2);

      const filtered = await http()
        .get('/api/projects?search=API&page=1')
        .set(bearer(member.accessToken))
        .expect(200);

      expect(
        filtered.body.items.every((project: { name: string }) => project.name.includes('API')),
      ).toBe(true);
    });

    it('exige autenticaciÃ³n (401)', async () => {
      await http().get('/api/projects').expect(401);
    });
  });
});
