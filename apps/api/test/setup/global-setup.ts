import './env';

import { execSync } from 'child_process';
import { join } from 'path';

import { PrismaClient } from '@prisma/client';

const API_ROOT = join(__dirname, '../..');

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
 * Se ejecuta una sola vez antes de todas las pruebas:
 *  1. aplica las migraciones de Prisma sobre la base de datos de pruebas,
 *  2. vacía las tablas para empezar desde un estado limpio.
 */
export default async function globalSetup(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('Falta TEST_DATABASE_URL / DATABASE_URL para los tests');
  }

  try {
    execSync('npx prisma migrate deploy --schema prisma/schema.prisma', {
      cwd: API_ROOT,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });

    const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    await prisma.$executeRawUnsafe(TRUNCATE_SQL);
    await prisma.$disconnect();

    process.env.TASKFLOW_DB_READY = '1';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `\n[tests] No se pudo preparar PostgreSQL. Los tests de integración se omitirán.\n` +
        `[tests] Levanta la base de datos (docker compose up -d db) o revisa apps/api/.env\n` +
        `[tests] Detalle: ${message}\n`,
    );

    process.env.TASKFLOW_DB_READY = '0';
  }
}
