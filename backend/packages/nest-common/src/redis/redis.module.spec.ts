import { Test } from '@nestjs/testing';

import { LogLevel } from '../enums/log-level.enum.js';
import { AppLoggerModule } from '../logger/app-logger.module.js';

import { CacheStore } from './cache-store.js';
import { RedisCacheStore } from './redis-cache.store.js';
import { RedisHealthIndicator } from './redis-health.indicator.js';
import { RedisModule } from './redis.module.js';

describe('RedisModule', () => {
  it('provides the Redis cache store and health indicator to every module', async () => {
    // compile() builds the providers without connecting (connection happens on init()).
    const moduleRef = await Test.createTestingModule({
      imports: [
        AppLoggerModule.forRoot({ serviceName: 'test', level: LogLevel.Silent, pretty: false }),
        RedisModule.forRoot({ url: 'redis://127.0.0.1:1' }),
      ],
    }).compile();

    expect(moduleRef.get(CacheStore)).toBeInstanceOf(RedisCacheStore);
    expect(moduleRef.get(RedisHealthIndicator)).toBeInstanceOf(RedisHealthIndicator);
  });
});
