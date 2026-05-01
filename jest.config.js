/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@scalar/express-api-reference$': '<rootDir>/tests/__mocks__/scalarMock.cjs',
    '^express-jwt$': '<rootDir>/tests/__mocks__/express-jwt.js',
    '^jwks-rsa$': '<rootDir>/tests/__mocks__/jwks-rsa.js',
  },
};
