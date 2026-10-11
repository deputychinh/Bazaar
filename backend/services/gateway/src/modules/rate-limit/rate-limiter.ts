import type { RateLimitResult, RateLimitRule } from '../../interfaces/rate-limit.interface.js';

/** Port: counts a hit against `key` and says whether it is still within the rule. */
export abstract class RateLimiter {
  public abstract hit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}
