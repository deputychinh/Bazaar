import { defineConfig } from 'vitest/config';

import shared from '../../vitest.shared.ts';

// End-to-end saga tests: talk to the running gateway, catalog and order services (and Kafka)
// over HTTP only. Start them first (CI does; locally: make up, seed, make dev-*).
export default defineConfig({
  ...shared,
  test: {
    ...shared.test,
    include: ['test/e2e/**/*.e2e-spec.ts'],
    setupFiles: ['test/integration/load-env.ts'],
    coverage: { enabled: false },
    testTimeout: 120_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
