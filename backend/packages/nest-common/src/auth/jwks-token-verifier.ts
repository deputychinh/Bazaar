import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { SERVICE_AUTH_OPTIONS } from '../constants/injection-token.constant.js';
import { UnauthenticatedError } from '../errors/unauthenticated.error.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';
import type { ServiceAuthModuleOptions } from '../interfaces/service-auth-options.interface.js';

import { accessTokenClaimsSchema } from './access-token-claims.schema.js';
import { TokenVerifier } from './token-verifier.js';

/** Verifies gateway-issued tokens with the gateway's public keys (fetched once, cached). */
@Injectable()
export class JwksTokenVerifier extends TokenVerifier {
  private readonly keySet: ReturnType<typeof createRemoteJWKSet>;

  public constructor(
    @Inject(SERVICE_AUTH_OPTIONS) private readonly options: ServiceAuthModuleOptions,
  ) {
    super();
    this.keySet = createRemoteJWKSet(new URL(options.jwksUrl));
  }

  public async verify(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, this.keySet, {
        algorithms: ['RS256'],
        issuer: this.options.issuer,
        audience: this.options.audience,
      });
      const claims = accessTokenClaimsSchema.parse(payload);
      return { id: claims.sub, email: claims.email, role: claims.role };
    } catch {
      throw new UnauthenticatedError('Invalid or expired access token');
    }
  }
}
