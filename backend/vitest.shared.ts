// Shared Vitest settings for every backend package and service.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Coverage measures logic; pure declarations (enums, constants, interfaces) are excluded.
      exclude: [
        'src/**/index.ts',
        'src/main.ts',
        'src/**/*.spec.ts',
        'src/**/*.enum.ts',
        'src/**/*.constant.ts',
        'src/**/*.interface.ts',
      ],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
