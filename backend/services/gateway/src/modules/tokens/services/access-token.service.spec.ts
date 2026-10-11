import { ACCESS_TOKEN_TTL_SECONDS, UserRole } from '@bazaar/contracts';
import { UnauthenticatedError } from '@bazaar/nest-common';

import { buildAccessTokenService } from '../../../../test/fakes/auth.fakes.js';

const caller = { id: 'user-1', email: 'admin@bazaar.test', role: UserRole.Admin };

describe('AccessTokenService', () => {
  it('signs a token that verifies back to the same caller', async () => {
    const { service } = await buildAccessTokenService();

    const issued = await service.sign(caller);

    expect(issued.expiresIn).toBe(ACCESS_TOKEN_TTL_SECONDS);
    await expect(service.verify(issued.accessToken)).resolves.toEqual(caller);
  });

  it('rejects an expired token', async () => {
    const { service, clock } = await buildAccessTokenService();
    const issued = await service.sign(caller);
    clock.advanceBy((ACCESS_TOKEN_TTL_SECONDS + 1) * 1000);

    await expect(service.verify(issued.accessToken)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('rejects a token signed with another key or changed after signing', async () => {
    const { service } = await buildAccessTokenService();
    const other = await buildAccessTokenService();
    const foreign = await other.service.sign(caller);
    const issued = await service.sign(caller);
    const [header, , signature] = issued.accessToken.split('.');
    const forgedClaims = Buffer.from(
      JSON.stringify({ sub: 'user-1', role: 'ADMIN', email: 'x@y.z' }),
    ).toString('base64url');

    await expect(service.verify(foreign.accessToken)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(service.verify(`${header}.${forgedClaims}.${signature}`)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  it('publishes the public key as a JWK set', async () => {
    const { keys } = await buildAccessTokenService();

    expect(keys.jwks().keys[0]).toMatchObject({
      kty: 'RSA',
      alg: 'RS256',
      use: 'sig',
      kid: 'bazaar-gateway-1',
    });
    expect(keys.jwks().keys[0]).not.toHaveProperty('d');
  });
});
