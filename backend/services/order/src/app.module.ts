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
import type { OrderEnv } from './config/env.schema.js';
import { PrismaHealthIndicator } from './infrastructure/prisma/prisma-health.indicator.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { FulfilmentModule } from './modules/fulfilment/fulfilment.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { SagaModule } from './modules/saga/saga.module.js';
import { StatsModule } from './modules/stats/stats.module.js';

@Global()
@Module({})
export class AppModule {
  /** Builds the application from validated configuration (read once in main.ts). */
  public static forRoot(env: OrderEnv): DynamicModule {
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
          internalApiKey: env.INTERNAL_API_KEY,
        }),
        KafkaModule.forRoot({ clientId: env.SERVICE_NAME, brokers: env.KAFKA_BROKERS }),
        RedisModule.forRoot({ url: env.REDIS_URL }),
        PrismaModule,
        HealthModule.forRoot([PrismaHealthIndicator, RedisHealthIndicator, KafkaHealthIndicator]),
        OutboxModule,
        EventsModule,
        PaymentsModule,
        OrdersModule,
        SagaModule,
        FulfilmentModule,
        StatsModule,
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
