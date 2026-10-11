import { type DynamicModule, Module } from '@nestjs/common';

import { REDIS_MODULE_OPTIONS } from '../constants/injection-token.constant.js';
import type { RedisModuleOptions } from '../interfaces/redis-module-options.interface.js';

import { RedisHealthIndicator } from './redis-health.indicator.js';
import { RedisService } from './redis.service.js';

@Module({})
export class RedisModule {
  public static forRoot(options: RedisModuleOptions): DynamicModule {
    return {
      module: RedisModule,
      global: true,
      providers: [
        { provide: REDIS_MODULE_OPTIONS, useValue: options },
        RedisService,
        RedisHealthIndicator,
      ],
      exports: [RedisService, RedisHealthIndicator],
    };
  }
}
