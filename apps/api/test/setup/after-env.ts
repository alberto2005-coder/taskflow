import { PrismaClient } from '@prisma/client';

const TRUNCATE_SQL = `
  TRUNCATE TABLE
    "RefreshToken",
    "Comment",
    "Task",
    "ProjectMember",
    "Project",
    "User"
  RESTART IDENTITY CASCADE;
`;

/**
 * Cada fichero de pruebas empieza con la base de datos vacía.
 * Los ficheros se ejecutan en serie (`maxWorkers: 1`) para evitar carreras.
 */
beforeAll(async () => {
  if (process.env.TASKFLOW_DB_READY === '0') return;

  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(TRUNCATE_SQL);
  await prisma.$disconnect();
});
