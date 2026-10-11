import { Global, Module } from '@nestjs/common';

import { RateLimiter } from './rate-limiter.js';
import { RedisRateLimiter } from './redis-rate-limiter.js';

@Global()
@Module({
  providers: [{ provide: RateLimiter, useClass: RedisRateLimiter }],
  exports: [RateLimiter],
})
export class RateLimitModule {}
