import { describe } from '@jest/globals';

/** Firma de `describe`: nombre del suite y callback con los casos. */
type SuiteFn = (name: string, fn: () => void) => void;

/** `true` si PostgreSQL respondió correctamente en el globalSetup. */
export function dbReady(): boolean {
  return process.env.TASKFLOW_DB_READY !== '0';
}

/**
 * Devuelve `describe` normal si hay base de datos disponible y
 * `describe.skip` en caso contrario (así los tests de integración se
 * omiten con un aviso en lugar de fallar cuando no hay BD).
 *
 * Los tests unitarios se ejecutan siempre.
 *
 * @example
 * const describeWithDb = dbSuite();
 * describeWithDb('POST /auth/login', () => { ... });
 */
export function dbSuite(): SuiteFn {
  const suite = dbReady() ? describe : describe.skip;
  return suite as unknown as SuiteFn;
}
