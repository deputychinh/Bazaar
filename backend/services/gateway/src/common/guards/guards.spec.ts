import { UserRole } from '@bazaar/contracts';
import { ForbiddenError, IS_PUBLIC_KEY, UnauthenticatedError } from '@bazaar/nest-common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { buildAccessTokenService } from '../../../test/fakes/auth.fakes.js';
import { ROLES_KEY } from '../../constants/metadata.constant.js';

import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';

const contextFor = (request: Record<string, unknown>): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const reflectorReturning = (key: string, value: unknown): Reflector => {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((asked) =>
    asked === key ? value : undefined,
  );
  return reflector;
};

describe('JwtAuthGuard', () => {
  it('lets public routes through without a token', async () => {
    const { service } = await buildAccessTokenService();
    const guard = new JwtAuthGuard(reflectorReturning(IS_PUBLIC_KEY, true), service);

    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(true);
  });

  it('attaches the caller for a valid bearer token', async () => {
    const { service } = await buildAccessTokenService();
    const { accessToken } = await service.sign({
      id: 'u1',
      email: 'a@b.test',
      role: UserRole.Seller,
    });
    const request: Record<string, unknown> = {
      headers: { authorization: `Bearer ${accessToken}` },
    };

    await new JwtAuthGuard(new Reflector(), service).canActivate(contextFor(request));

    expect(request.user).toEqual({ id: 'u1', email: 'a@b.test', role: UserRole.Seller });
  });

  it('rejects a missing or malformed authorization header', async () => {
    const { service } = await buildAccessTokenService();
    const guard = new JwtAuthGuard(new Reflector(), service);

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Basic abc' } })),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe('RolesGuard', () => {
  it('allows routes without @Roles', () => {
    expect(new RolesGuard(new Reflector()).canActivate(contextFor({}))).toBe(true);
  });

  it('allows a caller with one of the required roles and refuses others', () => {
    const guard = new RolesGuard(reflectorReturning(ROLES_KEY, [UserRole.Admin]));

    expect(guard.canActivate(contextFor({ user: { role: UserRole.Admin } }))).toBe(true);
    expect(() => guard.canActivate(contextFor({ user: { role: UserRole.Shopper } }))).toThrow(
      ForbiddenError,
    );
    expect(() => guard.canActivate(contextFor({}))).toThrow(ForbiddenError);
  });
});
