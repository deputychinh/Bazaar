import {
  AppLoggerModule,
  Environment,
  HealthModule,
  HttpCommonModule,
  KafkaHealthIndicator,
  KafkaModule,
} from '@bazaar/nest-common';
import { type DynamicModule, Global, Module } from '@nestjs/common';

import { AppConfig } from './config/app-config.js';
import type { GatewayEnv } from './config/env.schema.js';
import { PrismaHealthIndicator } from './infrastructure/prisma/prisma-health.indicator.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { RedisHealthIndicator } from './infrastructure/redis/redis-health.indicator.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';

@Global()
@Module({})
export class AppModule {
  /** Builds the application from validated configuration (read once in main.ts). */
  public static forRoot(env: GatewayEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppLoggerModule.forRoot({
          serviceName: env.SERVICE_NAME,
          level: env.LOG_LEVEL,
          pretty: env.NODE_ENV === Environment.Development,
        }),
        HttpCommonModule,
        KafkaModule.forRoot({ clientId: env.SERVICE_NAME, brokers: env.KAFKA_BROKERS }),
        PrismaModule,
        RedisModule,
        HealthModule.forRoot([PrismaHealthIndicator, RedisHealthIndicator, KafkaHealthIndicator]),
      ],
      providers: [{ provide: AppConfig, useValue: new AppConfig(env) }],
      exports: [AppConfig],
    };
  }
}
