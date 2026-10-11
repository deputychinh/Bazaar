import { RateLimitPolicy } from '../enums/rate-limit-policy.enum.js';
import type { RateLimitRule } from '../interfaces/rate-limit.interface.js';

/** Requests allowed per client IP and route in each fixed window. */
export const RATE_LIMITS: Readonly<Record<RateLimitPolicy, RateLimitRule>> = {
  [RateLimitPolicy.Default]: { limit: 300, windowSeconds: 60 },
  [RateLimitPolicy.Strict]: { limit: 10, windowSeconds: 60 },
};
export const RATE_LIMIT_KEY_PREFIX = 'rate-limit';
