import { type DynamicModule, Module, type Type } from '@nestjs/common';

import { HEALTH_INDICATORS } from '../constants/injection-token.constant.js';

import type { HealthIndicator } from './health-indicator.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({})
export class HealthModule {
  /** Registers the health endpoints with the indicators this service depends on. */
  public static forRoot(indicators: Type<HealthIndicator>[] = []): DynamicModule {
    return {
      module: HealthModule,
      controllers: [HealthController],
      providers: [
        ...indicators,
        {
          provide: HEALTH_INDICATORS,
          useFactory: (...instances: HealthIndicator[]) => instances,
          inject: indicators,
        },
        HealthService,
      ],
    };
  }
}
