import {
  type DynamicModule,
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from '@nestjs/common';

import { METRICS_MODULE_OPTIONS } from '../constants/injection-token.constant.js';
import type { MetricsModuleOptions } from '../interfaces/metrics-module-options.interface.js';

import { HttpMetricsMiddleware } from './http-metrics.middleware.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsRegistry } from './metrics.registry.js';

/** `/metrics` plus HTTP RED metrics for every route (plan §9.3, NFR-08). Global. */
@Module({})
export class MetricsModule implements NestModule {
  public static forRoot(options: MetricsModuleOptions): DynamicModule {
    return {
      module: MetricsModule,
      global: true,
      controllers: [MetricsController],
      providers: [
        { provide: METRICS_MODULE_OPTIONS, useValue: options },
        MetricsRegistry,
        HttpMetricsMiddleware,
      ],
      exports: [MetricsRegistry],
    };
  }

  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}
