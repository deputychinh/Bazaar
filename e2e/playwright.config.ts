import { defineConfig, devices } from '@playwright/test';

// Journeys run against the stack you already started (make up, seed, services, admin site).
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Journeys share one real database: run them one at a time.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI === undefined ? 0 : 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.ADMIN_URL ?? 'http://localhost:3200',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
