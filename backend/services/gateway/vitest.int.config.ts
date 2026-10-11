import { defineConfig } from 'vitest/config';

import shared from '../../vitest.shared.ts';

// Integration tests talk to the real infrastructure started by `make up`.
// Built by spreading (not mergeConfig) so `include` replaces the unit-test pattern.
export default defineConfig({
  ...shared,
  test: {
    ...shared.test,
    include: ['test/integration/**/*.int-spec.ts'],
    setupFiles: ['test/integration/load-env.ts'],
    coverage: { enabled: false },
    testTimeout: 120_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
