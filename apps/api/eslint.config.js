const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'prisma/migrations/**',
      'eslint.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // OFF a propósito: convertir los inyectados por DI de NestJS en
      // `import type` rompe emitDecoratorMetadata (Nest recibe `Function`
      // como tipo de dependencia y deja de resolver los providers).
      '@typescript-eslint/consistent-type-imports': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // scripts auxiliares (seed) y arranque de la API: se permite console
    files: ['prisma/**/*.ts', 'src/main.ts', 'test/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  prettier,
);
