import { PrismaClient, Role, TaskPriority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Datos de demostración:
 *   admin@taskflow.dev / Manager123! / manager@taskflow.dev / Member123! (contraseña de los tres: Taskflow123!)
 */
async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('Taskflow123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskflow.dev' },
    update: {},
    create: {
      email: 'admin@taskflow.dev',
      name: 'Alice Admin',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@taskflow.dev' },
    update: {},
    create: {
      email: 'manager@taskflow.dev',
      name: 'Marco Manager',
      passwordHash,
      role: Role.MANAGER,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@taskflow.dev' },
    update: {},
    create: {
      email: 'member@taskflow.dev',
      name: 'Marta Member',
      passwordHash,
      role: Role.MEMBER,
    },
  });

  const existing = await prisma.project.count();
  if (existing > 0) {
    console.log('✔ Seed: ya existían proyectos, no se duplica nada.');
    return;
  }

  const web = await prisma.project.create({
    data: {
      name: 'Rediseño de la web',
      description: 'Migración a React 18, nuevo sistema de diseño y mejora de Lighthouse.',
      ownerId: manager.id,
      members: { create: [{ userId: member.id }, { userId: admin.id }] },
    },
  });

  const api = await prisma.project.create({
    data: {
      name: 'API pública',
      description: 'Endpoints REST documentados con Swagger y autenticación JWT.',
      ownerId: manager.id,
      members: { create: [{ userId: member.id }] },
    },
  });

  const tasks: Array<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    projectId: string;
    assigneeId: string;
  }> = [
    {
      title: 'Definir paleta de colores',
      description: 'Crear la escala de colores accesible (AA) para marca y estados.',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      projectId: web.id,
      assigneeId: member.id,
    },
    {
      title: 'Maquetar la landing',
      description: 'Hero, features y CTA con Tailwind CSS.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      projectId: web.id,
      assigneeId: member.id,
    },
    {
      title: 'Optimizar imágenes',
      description: 'Formato WebP y lazy loading.',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      projectId: web.id,
      assigneeId: member.id,
    },
    {
      title: 'Documentar endpoints de auth',
      description: 'Añadir ejemplos de petición/respuesta en Swagger.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      projectId: api.id,
      assigneeId: manager.id,
    },
    {
      title: 'Rate limiting',
      description: 'Limitar peticiones por IP en /auth/login.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      projectId: api.id,
      assigneeId: manager.id,
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: task });
  }

  const firstTask = await prisma.task.findFirst({ where: { title: 'Maquetar la landing' } });
  if (firstTask) {
    await prisma.comment.create({
      data: {
        taskId: firstTask.id,
        authorId: manager.id,
        content: 'Buen progreso. Prioriza la versión móvil antes de cerrar la tarea.',
      },
    });
  }

  console.log('✔ Seed completado:');
  console.log('   admin@taskflow.dev   · Taskflow123!  (ADMIN)');
  console.log('   manager@taskflow.dev · Taskflow123!  (MANAGER)');
  console.log('   member@taskflow.dev  · Taskflow123!  (MEMBER)');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
