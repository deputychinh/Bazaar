import { mergeConfig } from 'vitest/config';

import shared from '../../vitest.shared.ts';

export default mergeConfig(shared, {
  test: {
    coverage: {
      // Wiring, bootstrap and infrastructure adapters are covered by the integration tests.
      exclude: [
        'src/**/*.module.ts',
        'src/openapi.ts',
        'src/app.setup.ts',
        'src/infrastructure/**',
        'src/**/prisma-*.ts',
        'src/modules/catalog-proxy/catalog-proxy.controller.ts',
      ],
    },
  },
});
