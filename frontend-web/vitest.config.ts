import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Route files and next-intl wiring are covered by the build and e2e; declarations hold no logic.
      exclude: [
        'src/api/**',
        'src/app/**',
        'src/proxy.ts',
        'src/i18n/*.ts',
        'src/**/index.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.constant.ts',
        'src/**/*.enum.ts',
        'src/**/*.interface.ts',
      ],
      thresholds: { lines: 80 },
    },
  },
});
