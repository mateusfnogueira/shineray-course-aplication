import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts', '!**/index.ts', '!**/main.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@compliance/shared$': '<rootDir>/../../../packages/shared/src',
    '^@compliance/shared/(.*)$': '<rootDir>/../../../packages/shared/src/$1',
  },
};

export default config;
