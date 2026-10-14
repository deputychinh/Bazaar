import { defineConfig, devices } from '@playwright/test';

// `npm run screenshots`: README pictures from the running staging cluster (kind) into docs/screenshots.
export default defineConfig({
  testDir: './screenshots',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    // signIn() opens /login on the admin site.
    baseURL: process.env.ADMIN_URL ?? 'http://admin.bazaar.localhost',
  },
});
