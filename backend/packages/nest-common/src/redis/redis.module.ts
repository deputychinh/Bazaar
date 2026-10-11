import { type DynamicModule, Module } from '@nestjs/common';

import { REDIS_MODULE_OPTIONS } from '../constants/injection-token.constant.js';
import type { RedisModuleOptions } from '../interfaces/redis-module-options.interface.js';

import { CacheStore } from './cache-store.js';
import { RedisCacheStore } from './redis-cache.store.js';
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
        { provide: CacheStore, useClass: RedisCacheStore },
      ],
      exports: [RedisService, RedisHealthIndicator, CacheStore],
    };
  }
}
