import { METRICS_ROUTE } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

import { API_PREFIX } from './constants/order.constant.js';

/** HTTP setup shared by main.ts, the OpenAPI export and integration tests. */
export class AppSetup {
  public static configure(app: INestApplication): void {
    app.use(helmet());
    app.setGlobalPrefix(API_PREFIX, { exclude: ['health/live', 'health/ready', METRICS_ROUTE] });
    app.enableShutdownHooks();
  }
}
