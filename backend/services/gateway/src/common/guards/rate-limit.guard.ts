import { HEALTH_ROUTE, PromiseUtil } from '@bazaar/nest-common';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import { AppConfig } from '../../config/app-config.js';
import { RATE_LIMIT_POLICY_KEY } from '../../constants/metadata.constant.js';
import { RATE_LIMIT_KEY_PREFIX, RATE_LIMITS } from '../../constants/rate-limit.constant.js';
import { RateLimitPolicy } from '../../enums/rate-limit-policy.enum.js';
import type { RateLimitResult, RateLimitRule } from '../../interfaces/rate-limit.interface.js';
import { RateLimiter } from '../../modules/rate-limit/rate-limiter.js';
import { RateLimitedError } from '../errors/rate-limited.error.js';

/** Global guard, runs first: limits each client IP per route; fails open if Redis is down. */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly rules: Readonly<Record<RateLimitPolicy, RateLimitRule>>;

  public constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimiter,
    private readonly logger: PinoLogger,
    config: AppConfig,
  ) {
    this.logger.setContext(RateLimitGuard.name);
    const { RATE_LIMIT_DEFAULT_PER_MINUTE, RATE_LIMIT_STRICT_PER_MINUTE } = config.env;
    this.rules = {
      [RateLimitPolicy.Default]: {
        ...RATE_LIMITS[RateLimitPolicy.Default],
        limit: RATE_LIMIT_DEFAULT_PER_MINUTE,
      },
      [RateLimitPolicy.Strict]: {
        ...RATE_LIMITS[RateLimitPolicy.Strict],
        limit: RATE_LIMIT_STRICT_PER_MINUTE,
      },
    };
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    if (request.path.startsWith(`/${HEALTH_ROUTE}`)) {
      return true;
    }
    const policy =
      this.reflector.getAllAndOverride<RateLimitPolicy | undefined>(RATE_LIMIT_POLICY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? RateLimitPolicy.Default;
    const route = `${request.method}:${context.getClass().name}.${context.getHandler().name}`;
    const key = `${RATE_LIMIT_KEY_PREFIX}:${policy}:${route}:${request.ip ?? 'unknown'}`;
    let result: RateLimitResult;
    try {
      result = await this.limiter.hit(key, this.rules[policy]);
    } catch (error) {
      this.logger.warn(
        { reason: PromiseUtil.errorMessage(error) },
        'rate limiter unavailable, allowing request',
      );
      return true;
    }
    RateLimitGuard.setHeaders(http.getResponse<Response>(), result);
    if (!result.allowed) {
      throw new RateLimitedError('Too many requests, please try again later', {
        retryAfterSeconds: result.resetSeconds,
      });
    }
    return true;
  }

  private static setHeaders(response: Response, result: RateLimitResult): void {
    response.setHeader('RateLimit-Limit', String(result.limit));
    response.setHeader('RateLimit-Remaining', String(result.remaining));
    response.setHeader('RateLimit-Reset', String(result.resetSeconds));
    if (!result.allowed) {
      response.setHeader('Retry-After', String(result.resetSeconds));
    }
  }
}
