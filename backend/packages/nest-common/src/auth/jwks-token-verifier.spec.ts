import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { UserRole } from '@bazaar/contracts';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

import { UnauthenticatedError } from '../errors/unauthenticated.error.js';

import { JwksTokenVerifier } from './jwks-token-verifier.js';

describe('JwksTokenVerifier', () => {
  let server: Server;
  let verifier: JwksTokenVerifier;
  let sign: (claims: Record<string, unknown>, audience?: string) => Promise<string>;

  beforeAll(async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
    server = createServer((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ keys: [jwk] }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    verifier = new JwksTokenVerifier({
      jwksUrl: `http://127.0.0.1:${port}/.well-known/jwks.json`,
      issuer: 'bazaar-gateway',
      audience: 'bazaar',
    });
    sign = (claims, audience = 'bazaar') =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
        .setIssuer('bazaar-gateway')
        .setAudience(audience)
        .setExpirationTime('5m')
        .sign(privateKey);
  });

  afterAll(() => {
    server.close();
  });

  it('accepts a gateway token and returns the caller', async () => {
    const token = await sign({ sub: 'u1', email: 'minh@bazaar.test', role: UserRole.Seller });

    await expect(verifier.verify(token)).resolves.toEqual({
      id: 'u1',
      email: 'minh@bazaar.test',
      role: UserRole.Seller,
    });
  });

  it('rejects a token for another audience or with an unknown role', async () => {
    const otherAudience = await sign(
      { sub: 'u1', email: 'a@b.test', role: UserRole.Admin },
      'someone-else',
    );
    const badRole = await sign({ sub: 'u1', email: 'a@b.test', role: 'KING' });

    await expect(verifier.verify(otherAudience)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(verifier.verify(badRole)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(verifier.verify('not-a-jwt')).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
