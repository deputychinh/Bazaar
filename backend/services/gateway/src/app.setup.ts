import { METRICS_ROUTE } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import type { GatewayEnv } from './config/env.schema.js';
import { JWKS_PATH } from './constants/auth.constant.js';
import { API_PREFIX } from './constants/gateway.constant.js';

/** HTTP setup shared by main.ts, the OpenAPI export and integration tests. */
export class AppSetup {
  public static configure(app: INestApplication, env: GatewayEnv): void {
    (app as NestExpressApplication).set('trust proxy', env.TRUST_PROXY_HOPS);
    app.use(helmet());
    app.use(cookieParser());
    app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
    app.setGlobalPrefix(API_PREFIX, {
      exclude: ['health/live', 'health/ready', METRICS_ROUTE, JWKS_PATH],
    });
    app.enableShutdownHooks();
  }
}
