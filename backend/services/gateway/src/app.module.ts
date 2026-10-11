import {
  AccessTokenGuard,
  AppLoggerModule,
  Clock,
  Environment,
  HealthModule,
  HttpCommonModule,
  KafkaHealthIndicator,
  KafkaModule,
  RolesGuard,
  SystemClock,
} from '@bazaar/nest-common';
import { type DynamicModule, Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { RateLimitGuard } from './common/guards/rate-limit.guard.js';
import { AppConfig } from './config/app-config.js';
import type { GatewayEnv } from './config/env.schema.js';
import { PrismaHealthIndicator } from './infrastructure/prisma/prisma-health.indicator.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { RedisHealthIndicator } from './infrastructure/redis/redis-health.indicator.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module.js';
import { SellersModule } from './modules/sellers/sellers.module.js';
import { TokensModule } from './modules/tokens/tokens.module.js';

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
        OutboxModule,
        RateLimitModule,
        TokensModule,
        AuthModule,
        SellersModule,
      ],
      providers: [
        { provide: AppConfig, useValue: new AppConfig(env) },
        { provide: Clock, useClass: SystemClock },
        // Order matters: rate limit first, then authentication, then roles.
        { provide: APP_GUARD, useClass: RateLimitGuard },
        { provide: APP_GUARD, useClass: AccessTokenGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
      exports: [AppConfig, Clock],
    };
  }
}
