import {
  AccessTokenGuard,
  AppLoggerModule,
  Clock,
  FixedClock,
  HttpCommonModule,
  InternalApiGuard,
  LogLevel,
  RolesGuard,
  SERVICE_AUTH_OPTIONS,
  TokenVerifier,
} from '@bazaar/nest-common';
import type { INestApplication, Provider, Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { API_PREFIX } from '../../src/constants/order.constant.js';

import { FakeTokenVerifier, NOW, TEST_INTERNAL_KEY } from './order.fakes.js';

/** Real HTTP layer (guards, pipes, error filter) with the given controllers and fake adapters. */
export const createOrderTestApp = async (
  controllers: Type[],
  providers: Provider[],
): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      AppLoggerModule.forRoot({ serviceName: 'test', level: LogLevel.Silent, pretty: false }),
      HttpCommonModule,
    ],
    controllers,
    providers: [
      ...providers,
      { provide: Clock, useValue: new FixedClock(NOW) },
      { provide: TokenVerifier, useClass: FakeTokenVerifier },
      {
        provide: SERVICE_AUTH_OPTIONS,
        useValue: {
          jwksUrl: 'http://test',
          issuer: 'test',
          audience: 'test',
          internalApiKey: TEST_INTERNAL_KEY,
        },
      },
      { provide: APP_GUARD, useClass: InternalApiGuard },
      { provide: APP_GUARD, useClass: AccessTokenGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(API_PREFIX);
  await app.init();
  return app;
};
