import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Carga un fichero `.env` sin depender de librerías externas.
 * Los valores ya presentes en `process.env` tienen prioridad.
 */
function applyEnvFile(file: string): void {
  if (!existsSync(file)) return;

  const content = readFileSync(file, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// apps/api/.env y .env de la raíz del monorepo
applyEnvFile(join(__dirname, '../.env'));
applyEnvFile(join(__dirname, '../../../.env'));

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/taskflow_test';

// Los tests NUNCA tocan la base de datos de desarrollo
process.env.DATABASE_URL = testDatabaseUrl;
process.env.TEST_DATABASE_URL = testDatabaseUrl;
process.env.JWT_ACCESS_SECRET ??= 'taskflow-test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'taskflow-test-refresh-secret';
process.env.NODE_ENV ??= 'test';
