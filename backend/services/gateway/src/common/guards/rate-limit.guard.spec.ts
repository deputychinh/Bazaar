import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PinoLogger } from 'nestjs-pino';

import { InMemoryRateLimiter } from '../../../test/fakes/auth.fakes.js';
import { RATE_LIMIT_POLICY_KEY } from '../../constants/metadata.constant.js';
import { RateLimitPolicy } from '../../enums/rate-limit-policy.enum.js';
import { RateLimitedError } from '../errors/rate-limited.error.js';

import { RateLimitGuard } from './rate-limit.guard.js';

const logger = { setContext: vi.fn(), warn: vi.fn() } as unknown as PinoLogger;

class LoginController {
  public login(): void {
    return undefined;
  }
}

const contextFor = (path: string, headers: Record<string, string>): ExecutionContext =>
  ({
    getHandler: () => LoginController.prototype.login,
    getClass: () => LoginController,
    switchToHttp: () => ({
      getRequest: () => ({ path, method: 'POST', ip: '10.0.0.1' }),
      getResponse: () => ({ setHeader: (name: string, value: string) => (headers[name] = value) }),
    }),
  }) as unknown as ExecutionContext;

const strictReflector = (): Reflector => {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) =>
    key === RATE_LIMIT_POLICY_KEY ? RateLimitPolicy.Strict : undefined,
  );
  return reflector;
};

describe('RateLimitGuard', () => {
  it('allows requests within the limit and reports what is left', async () => {
    const headers: Record<string, string> = {};
    const guard = new RateLimitGuard(new Reflector(), new InMemoryRateLimiter(), logger);

    await expect(guard.canActivate(contextFor('/api/v1/auth/login', headers))).resolves.toBe(true);

    expect(headers).toMatchObject({ 'RateLimit-Limit': '300', 'RateLimit-Remaining': '299' });
  });

  it('rejects the request after the strict limit with Retry-After', async () => {
    const headers: Record<string, string> = {};
    const guard = new RateLimitGuard(strictReflector(), new InMemoryRateLimiter(), logger);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await guard.canActivate(contextFor('/api/v1/auth/login', headers));
    }

    await expect(
      guard.canActivate(contextFor('/api/v1/auth/login', headers)),
    ).rejects.toBeInstanceOf(RateLimitedError);
    expect(headers['Retry-After']).toBe('60');
  });

  it('never limits health checks', async () => {
    const limiter = new InMemoryRateLimiter();
    limiter.failWith = new Error('should not be called');
    const guard = new RateLimitGuard(new Reflector(), limiter, logger);

    await expect(guard.canActivate(contextFor('/health/ready', {}))).resolves.toBe(true);
  });

  it('lets traffic through when the limiter is down', async () => {
    const limiter = new InMemoryRateLimiter();
    limiter.failWith = new Error('redis unreachable');
    const guard = new RateLimitGuard(new Reflector(), limiter, logger);

    await expect(guard.canActivate(contextFor('/api/v1/auth/login', {}))).resolves.toBe(true);
    expect(logger.warn).toHaveBeenCalled();
  });
});
