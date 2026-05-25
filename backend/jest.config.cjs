/**
 * Configuration Jest pour le backend Bor-Bi.
 *
 * - ts-jest pour exécuter les sources TypeScript sans build préalable
 * - setupFiles charge les envs minimales AVANT le require de config/env
 *   (qui valide via zod et planterait sinon)
 * - moduleNameMapper évite d'avoir à builder @borbi/shared : on lit
 *   directement les sources TS
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@borbi/shared$': '<rootDir>/../shared/src/index.ts',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  clearMocks: true,
};
