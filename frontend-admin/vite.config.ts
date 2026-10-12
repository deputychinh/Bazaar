import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// The SPA calls /api on its own origin; locally Vite forwards it to the gateway (in Kubernetes the
// ingress does). Same origin keeps the refresh cookie first-party (SameSite=Strict) — no CORS.
const gateway = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 3200,
    strictPort: true,
    proxy: { '/api': { target: gateway, changeOrigin: false } },
  },
  preview: {
    port: 3200,
    proxy: { '/api': { target: gateway, changeOrigin: false } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // Bootstrap and declarations hold no logic; routes are covered by the journeys (Playwright).
      exclude: [
        'src/api/**',
        'src/main.tsx',
        'src/i18n/*.ts',
        'src/**/index.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.constant.ts',
        'src/**/*.enum.ts',
        'src/**/*.interface.ts',
        'src/test-utils/**',
      ],
      thresholds: { lines: 80 },
    },
  },
});
