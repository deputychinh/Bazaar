import { Injectable } from '@nestjs/common';

import { RedisService } from '../../infrastructure/redis/redis.service.js';
import type { RateLimitResult, RateLimitRule } from '../../interfaces/rate-limit.interface.js';

import { RateLimiter } from './rate-limiter.js';

/** Fixed-window counter shared by every gateway pod (plan §3.1 Redis). */
@Injectable()
export class RedisRateLimiter extends RateLimiter {
  public constructor(private readonly redis: RedisService) {
    super();
  }

  public async hit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const [count, , ttl] = await this.redis.client
      .multi()
      .incr(key)
      .expire(key, rule.windowSeconds, 'NX')
      .ttl(key)
      .exec();
    const hits = Number(count);
    return {
      allowed: hits <= rule.limit,
      limit: rule.limit,
      remaining: Math.max(rule.limit - hits, 0),
      resetSeconds: Math.max(Number(ttl), 0),
    };
  }
}
