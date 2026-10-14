import { defineConfig } from 'vitest/config';

// Synthesizing every stack is CPU-heavy (bundled assets, cdk-nag): one file at a time.
export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    testTimeout: 120_000,
    fileParallelism: false,
  },
});
