import { SetMetadata } from '@nestjs/common';

import { RATE_LIMIT_POLICY_KEY } from '../../constants/metadata.constant.js';
import type { RateLimitPolicy } from '../../enums/rate-limit-policy.enum.js';

/** Chooses the rate-limit policy of a route (default: RateLimitPolicy.Default). */
export const RateLimit = (policy: RateLimitPolicy): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_POLICY_KEY, policy);
