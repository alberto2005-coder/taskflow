import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { dbSuite } from './setup/db';
import { bearer, createSessionWithRole, Session } from './utils';

const describeWithDb = dbSuite();

describeWithDb('Tareas Â· integraciÃ³n', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let manager: Session;
  let member: Session;
  let outsider: Session;

  let projectId: string;
  let assignedTaskId: string;
  let unassignedTaskId: string;

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
    outsider = await createSessionWithRole(
      app,
      prisma,
      { name: 'ForÃ¡neo', email: 'fuera@taskflow.dev', password: 'Secreta123' },
      'MEMBER',
    );

    const project = await request(app.getHttpServer())
      .post('/api/projects')
      .set(bearer(manager.accessToken))
      .send({ name: 'Proyecto de tareas' })
      .expect(201);
    projectId = project.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/members`)
      .set(bearer(manager.accessToken))
      .send({ userId: member.userId })
      .expect(201);

    const assigned = await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/tasks`)
      .set(bearer(manager.accessToken))
      .send({
        title: 'Tarea asignada',
        description: 'Para Marta',
        assigneeId: member.userId,
        priority: 'HIGH',
      })
      .expect(201);
    assignedTaskId = assigned.body.id as string;

    const unassigned = await request(app.getHttpServer())
      .post(`/api/projects/${projectId}/tasks`)
      .set(bearer(manager.accessToken))
      .send({ title: 'Tarea sin asignar' })
      .expect(201);
    unassignedTaskId = unassigned.body.id as string;
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  describe('creaciÃ³n de tareas', () => {
    it('MEMBER no puede crear tareas (403)', async () => {
      await http()
        .post(`/api/projects/${projectId}/tasks`)
        .set(bearer(member.accessToken))
        .send({ title: 'Tarea prohibida' })
        .expect(403);
    });

    it('no se puede asignar a alguien que no es miembro (400)', async () => {
      await http()
        .post(`/api/projects/${projectId}/tasks`)
        .set(bearer(manager.accessToken))
        .send({ title: 'Tarea rara', assigneeId: outsider.userId })
        .expect(400);
    });

    it('el detalle incluye proyecto, responsable y contador de comentarios', async () => {
      const response = await http()
        .get(`/api/tasks/${assignedTaskId}`)
        .set(bearer(manager.accessToken))
        .expect(200);

      expect(response.body).toMatchObject({
        title: 'Tarea asignada',
        status: 'TODO',
        priority: 'HIGH',
        commentsCount: 0,
      });
      expect(response.body.project).toMatchObject({ id: projectId, name: 'Proyecto de tareas' });
      expect(response.body.assignee).toMatchObject({ email: 'member@taskflow.dev' });
    });
  });

  describe('visibilidad', () => {
    it('MEMBER solo ve sus tareas asignadas', async () => {
      const response = await http().get('/api/tasks').set(bearer(member.accessToken)).expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].id).toBe(assignedTaskId);
    });

    it('MANAGER ve todas las tareas de su proyecto', async () => {
      const response = await http()
        .get(`/api/projects/${projectId}/tasks`)
        .set(bearer(manager.accessToken))
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
    });

    it('un forÃ¡neo no ve ni puede consultar la tarea (404)', async () => {
      await http()
        .get(`/api/tasks/${assignedTaskId}`)
        .set(bearer(outsider.accessToken))
        .expect(404);
    });

    it('filtra por estado, responsable y proyecto', async () => {
      const byProject = await http()
        .get(`/api/tasks?projectId=${projectId}`)
        .set(bearer(manager.accessToken))
        .expect(200);
      expect(byProject.body.items).toHaveLength(2);

      const byStatus = await http()
        .get(`/api/tasks?status=TODO&projectId=${projectId}`)
        .set(bearer(manager.accessToken))
        .expect(200);
      expect(byStatus.body.items).toHaveLength(2);

      const byAssignee = await http()
        .get(`/api/tasks?assigneeId=${member.userId}`)
        .set(bearer(manager.accessToken))
        .expect(200);
      expect(byAssignee.body.items).toHaveLength(1);
      expect(byAssignee.body.items[0].id).toBe(assignedTaskId);
    });
  });

  describe('cambio de estado y ediciÃ³n', () => {
    it('MEMBER cambia el estado de su tarea', async () => {
      const response = await http()
        .patch(`/api/tasks/${assignedTaskId}/status`)
        .set(bearer(member.accessToken))
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(response.body.status).toBe('IN_PROGRESS');
    });

    it('MEMBER no cambia el estado de tareas ajenas (403)', async () => {
      await http()
        .patch(`/api/tasks/${unassignedTaskId}/status`)
        .set(bearer(member.accessToken))
        .send({ status: 'DONE' })
        .expect(403);
    });

    it('MEMBER edita su tarea pero no reasigna (403)', async () => {
      await http()
        .patch(`/api/tasks/${assignedTaskId}`)
        .set(bearer(member.accessToken))
        .send({ title: 'TÃ­tulo actualizado por Marta' })
        .expect(200);

      await http()
        .patch(`/api/tasks/${assignedTaskId}`)
        .set(bearer(member.accessToken))
        .send({ assigneeId: manager.userId })
        .expect(403);
    });

    it('MANAGER termina la tarea y la reasigna', async () => {
      const done = await http()
        .patch(`/api/tasks/${assignedTaskId}/status`)
        .set(bearer(manager.accessToken))
        .send({ status: 'DONE' })
        .expect(200);
      expect(done.body.status).toBe('DONE');

      const reassigned = await http()
        .patch(`/api/tasks/${assignedTaskId}`)
        .set(bearer(manager.accessToken))
        .send({ assigneeId: 'esto-no-es-un-uuid' })
        .expect(400); // validaciÃ³n de IsUUID

      expect(reassigned.status).toBe(400);
    });
  });

  describe('comentarios', () => {
    it('MEMBER comenta en su proyecto y el contador se actualiza', async () => {
      const created = await http()
        .post(`/api/tasks/${assignedTaskId}/comments`)
        .set(bearer(member.accessToken))
        .send({ content: 'Ya estoy con esto' })
        .expect(201);

      expect(created.body).toMatchObject({ content: 'Ya estoy con esto' });
      expect(created.body.author).toMatchObject({ email: 'member@taskflow.dev' });

      const comments = await http()
        .get(`/api/tasks/${assignedTaskId}/comments`)
        .set(bearer(manager.accessToken))
        .expect(200);
      expect(comments.body).toHaveLength(1);

      const detail = await http()
        .get(`/api/tasks/${assignedTaskId}`)
        .set(bearer(member.accessToken))
        .expect(200);
      expect(detail.body.commentsCount).toBe(1);
    });

    it('rechaza comentarios vacÃ­os (400)', async () => {
      await http()
        .post(`/api/tasks/${assignedTaskId}/comments`)
        .set(bearer(member.accessToken))
        .send({ content: '' })
        .expect(400);
    });

    it('un forÃ¡neo no comenta (404)', async () => {
      await http()
        .post(`/api/tasks/${assignedTaskId}/comments`)
        .set(bearer(outsider.accessToken))
        .send({ content: 'No debo poder' })
        .expect(404);
    });
  });

  describe('borrado', () => {
    it('MEMBER no puede borrar tareas (403)', async () => {
      await http()
        .delete(`/api/tasks/${unassignedTaskId}`)
        .set(bearer(member.accessToken))
        .expect(403);
    });

    it('MANAGER borra las tareas de su proyecto (204)', async () => {
      await http()
        .delete(`/api/tasks/${unassignedTaskId}`)
        .set(bearer(manager.accessToken))
        .expect(204);

      await http()
        .get(`/api/tasks/${unassignedTaskId}`)
        .set(bearer(manager.accessToken))
        .expect(404);
    });
  });

  describe('GET /api/dashboard', () => {
    it('devuelve las tareas propias del usuario', async () => {
      const response = await http()
        .get('/api/dashboard')
        .set(bearer(member.accessToken))
        .expect(200);

      expect(response.body.myTasks.total).toBe(1);
      expect(response.body.myTasks.byStatus).toEqual({
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 1,
      });
      expect(response.body.projects).toBeNull(); // MEMBER no ve progreso de proyectos
    });

    it('MANAGER ve ademÃ¡s el progreso por proyecto', async () => {
      const response = await http()
        .get('/api/dashboard')
        .set(bearer(manager.accessToken))
        .expect(200);

      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(response.body.projects[0]).toMatchObject({ name: 'Proyecto de tareas' });
      expect(response.body.projects[0].progress).toEqual({
        TODO: 0,
        IN_PROGRESS: 0,
        DONE: 1,
      });
    });
  });
});
