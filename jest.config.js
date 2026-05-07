/** Dummy issuer/audience so `requireAuth` can load when `.env` is missing (CI, fresh clones). */
process.env.AUTH_ISSUER ||= 'https://test.example/auth';
process.env.API_AUDIENCE ||= 'test-api-audience';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  /** Seeds shared integration-test users once (see tests/seedIntegrationUsers.ts). */
  globalSetup: '<rootDir>/tests/globalSetup.cjs',
  // Runs before setupFilesAfterEnv and before tests so DATABASE_URL exists when `src/lib/prisma` loads.
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.ts'],
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@scalar/express-api-reference$': '<rootDir>/tests/__mocks__/scalarMock.cjs',
    '^express-jwt$': '<rootDir>/tests/__mocks__/express-jwt.js',
    '^jwks-rsa$': '<rootDir>/tests/__mocks__/jwks-rsa.js',
  },
};
