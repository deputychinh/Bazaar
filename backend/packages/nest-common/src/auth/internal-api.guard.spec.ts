import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_INTERNAL_KEY } from '../constants/metadata.constant.js';
import { ForbiddenError } from '../errors/forbidden.error.js';
import { SecretUtil } from '../utils/secret.util.js';

import { InternalApiGuard } from './internal-api.guard.js';

const KEY = 'k'.repeat(40);
const options = { jwksUrl: 'http://x', issuer: 'i', audience: 'a' };

const contextWith = (headers: Record<string, string>): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as unknown as ExecutionContext;

const reflector = (isInternal: boolean | undefined): Reflector => {
  const instance = new Reflector();
  vi.spyOn(instance, 'getAllAndOverride').mockImplementation((key) =>
    key === IS_INTERNAL_KEY ? isInternal : undefined,
  );
  return instance;
};

describe('InternalApiGuard', () => {
  it('ignores routes that are not internal', () => {
    const guard = new InternalApiGuard(reflector(undefined), options);
    expect(guard.canActivate(contextWith({}))).toBe(true);
  });

  it('admits the gateway with the shared key', () => {
    const guard = new InternalApiGuard(reflector(true), { ...options, internalApiKey: KEY });
    expect(guard.canActivate(contextWith({ 'x-internal-key': KEY }))).toBe(true);
  });

  it('refuses a missing or wrong key, and everything when no key is configured', () => {
    const guard = new InternalApiGuard(reflector(true), { ...options, internalApiKey: KEY });
    expect(() => guard.canActivate(contextWith({}))).toThrow(ForbiddenError);
    expect(() => guard.canActivate(contextWith({ 'x-internal-key': 'wrong' }))).toThrow(
      ForbiddenError,
    );

    const closed = new InternalApiGuard(reflector(true), options);
    expect(() => closed.canActivate(contextWith({ 'x-internal-key': KEY }))).toThrow(
      ForbiddenError,
    );
  });
});

describe('SecretUtil', () => {
  it('matches only identical secrets', () => {
    expect(SecretUtil.matches(KEY, KEY)).toBe(true);
    expect(SecretUtil.matches(KEY.slice(1), KEY)).toBe(false);
  });
});
