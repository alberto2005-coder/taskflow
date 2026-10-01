/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './',
  // Todos los tests viven en apps/api/test/ (unitarios y de integración)
  testMatch: ['<rootDir>/test/**/*.spec.ts', '<rootDir>/test/**/*.e2e-spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  // Las pruebas comparten una base de datos: se ejecutan en serie para evitar
  // que dos ficheros truncen las tablas al mismo tiempo.
  maxWorkers: 1,
  globalSetup: '<rootDir>/test/setup/global-setup.ts',
  setupFiles: ['<rootDir>/test/setup/env.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup/after-env.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/dto/**',
    '!src/**/index.ts',
    '!src/common/decorators/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    // Umbral por directorio (tipo PATH → agregado de todos los ficheros).
    // Un glob evaluaría fichero a fichero y jwt.strategy.ts (50 % de ramas) lo rompería.
    'src/auth': { statements: 70, branches: 70, functions: 70, lines: 70 },
    'src/users/permissions.ts': { statements: 90, branches: 85, functions: 90, lines: 90 },
  },
};
