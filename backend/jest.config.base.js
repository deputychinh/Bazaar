/** Shared Jest settings for every backend package and service. */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  // Coverage measures logic; pure declarations (enums, constants, interfaces) are excluded.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.constant.ts',
    '!src/**/*.interface.ts',
  ],
  coverageThreshold: {
    global: { lines: 80, branches: 80, functions: 80, statements: 80 },
  },
};
