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

import { AppConfig } from './config/app-config.js';
import type { CatalogEnv } from './config/env.schema.js';
import { PrismaHealthIndicator } from './infrastructure/prisma/prisma-health.indicator.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { QuoteModule } from './modules/quote/quote.module.js';
import { ShopsModule } from './modules/shops/shops.module.js';

@Global()
@Module({})
export class AppModule {
  /** Builds the application from validated configuration (read once in main.ts). */
  public static forRoot(env: CatalogEnv): DynamicModule {
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
        KafkaModule.forRootFromEnv(env),
        RedisModule.forRoot({ url: env.REDIS_URL }),
        PrismaModule,
        HealthModule.forRoot([PrismaHealthIndicator, RedisHealthIndicator, KafkaHealthIndicator]),
        OutboxModule,
        ShopsModule,
        CategoriesModule,
        ProductsModule,
        QuoteModule,
        EventsModule,
      ],
      providers: [
        { provide: AppConfig, useValue: new AppConfig(env) },
        { provide: Clock, useClass: SystemClock },
      ],
      exports: [AppConfig, Clock],
    };
  }
}
