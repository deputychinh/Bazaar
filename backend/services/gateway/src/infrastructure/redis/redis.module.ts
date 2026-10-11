import { Global, Module } from '@nestjs/common';

import { RedisHealthIndicator } from './redis-health.indicator.js';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  providers: [RedisService, RedisHealthIndicator],
  exports: [RedisService, RedisHealthIndicator],
})
export class RedisModule {}
