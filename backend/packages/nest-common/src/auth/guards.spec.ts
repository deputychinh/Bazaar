import { UserRole } from '@bazaar/contracts';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY, ROLES_KEY } from '../constants/metadata.constant.js';
import { ForbiddenError } from '../errors/forbidden.error.js';
import { UnauthenticatedError } from '../errors/unauthenticated.error.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

import { AccessTokenGuard } from './access-token.guard.js';
import { RolesGuard } from './roles.guard.js';
import { TokenVerifier } from './token-verifier.js';

const seller: AuthenticatedUser = { id: 'u1', email: 'a@b.test', role: UserRole.Seller };

class FakeVerifier extends TokenVerifier {
  public verify(token: string): Promise<AuthenticatedUser> {
    return token === 'good'
      ? Promise.resolve(seller)
      : Promise.reject(new UnauthenticatedError('bad token'));
  }
}

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

describe('AccessTokenGuard', () => {
  it('lets public routes through without a token', async () => {
    const guard = new AccessTokenGuard(reflectorReturning(IS_PUBLIC_KEY, true), new FakeVerifier());

    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(true);
  });

  it('attaches the caller for a valid bearer token', async () => {
    const request: Record<string, unknown> = { headers: { authorization: 'Bearer good' } };

    await new AccessTokenGuard(new Reflector(), new FakeVerifier()).canActivate(
      contextFor(request),
    );

    expect(request.user).toEqual(seller);
  });

  it('rejects missing, malformed and invalid tokens', async () => {
    const guard = new AccessTokenGuard(new Reflector(), new FakeVerifier());

    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Basic abc' } })),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Bearer bad' } })),
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
