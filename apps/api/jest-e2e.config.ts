import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.integration\\.spec\\.ts$|.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.json',
      },
    ],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@compliance/shared$': '<rootDir>/../../packages/shared/src',
    '^@compliance/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
};

export default config;
