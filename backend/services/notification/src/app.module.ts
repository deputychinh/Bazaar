import {
  AppLoggerModule,
  Clock,
  Environment,
  HealthModule,
  HttpCommonModule,
  KafkaHealthIndicator,
  KafkaModule,
  RedisHealthIndicator,
  RedisModule,
  ServiceAuthModule,
  SystemClock,
} from '@bazaar/nest-common';
import { type DynamicModule, Global, Module } from '@nestjs/common';

import { PrismaTransactionManager } from './common/transaction/prisma-transaction-manager.js';
import { TransactionManager } from './common/transaction/transaction-manager.js';
import { AppConfig } from './config/app-config.js';
import type { NotificationEnv } from './config/env.schema.js';
import { PrismaHealthIndicator } from './infrastructure/prisma/prisma-health.indicator.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { EventsModule } from './modules/events/events.module.js';

@Global()
@Module({})
export class AppModule {
  /** Builds the application from validated configuration (read once in main.ts). */
  public static forRoot(env: NotificationEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppLoggerModule.forRoot({
          serviceName: env.SERVICE_NAME,
          level: env.LOG_LEVEL,
          pretty: env.NODE_ENV === Environment.Development,
        }),
        HttpCommonModule,
        ServiceAuthModule.forRoot({
          jwksUrl: env.GATEWAY_JWKS_URL,
          issuer: env.JWT_ISSUER,
          audience: env.JWT_AUDIENCE,
        }),
        KafkaModule.forRoot({ clientId: env.SERVICE_NAME, brokers: env.KAFKA_BROKERS }),
        RedisModule.forRoot({ url: env.REDIS_URL }),
        PrismaModule,
        HealthModule.forRoot([PrismaHealthIndicator, RedisHealthIndicator, KafkaHealthIndicator]),
        EventsModule,
      ],
      providers: [
        { provide: AppConfig, useValue: new AppConfig(env) },
        { provide: Clock, useClass: SystemClock },
        { provide: TransactionManager, useClass: PrismaTransactionManager },
      ],
      exports: [AppConfig, Clock, TransactionManager],
    };
  }
}
