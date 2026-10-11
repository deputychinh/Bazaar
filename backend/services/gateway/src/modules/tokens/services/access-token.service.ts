import { ACCESS_TOKEN_TTL_SECONDS, UserRole } from '@bazaar/contracts';
import { Clock, UnauthenticatedError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';

import { AppConfig } from '../../../config/app-config.js';
import { JWT_ALGORITHM, JWT_KEY_ID } from '../../../constants/auth.constant.js';
import type { AuthenticatedUser } from '../../../interfaces/authenticated-user.interface.js';
import type { IssuedAccessToken } from '../../../interfaces/token.interface.js';
import { EnumUtil } from '../../../utils/enum.util.js';

import { KeyStore } from './key-store.js';

/** Signs and verifies short-lived RS256 access tokens (plan §2B Auth). */
@Injectable()
export class AccessTokenService {
  public constructor(
    private readonly keys: KeyStore,
    private readonly config: AppConfig,
    private readonly clock: Clock,
  ) {}

  public async sign(user: AuthenticatedUser): Promise<IssuedAccessToken> {
    const issuedAt = Math.floor(this.clock.now().getTime() / 1000);
    const accessToken = await new SignJWT({ email: user.email, role: user.role })
      .setProtectedHeader({ alg: JWT_ALGORITHM, kid: JWT_KEY_ID })
      .setSubject(user.id)
      .setIssuer(this.config.env.JWT_ISSUER)
      .setAudience(this.config.env.JWT_AUDIENCE)
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + ACCESS_TOKEN_TTL_SECONDS)
      .setJti(crypto.randomUUID())
      .sign(this.keys.signingKey());
    return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  public async verify(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, this.keys.verificationKey(), {
        algorithms: [JWT_ALGORITHM],
        issuer: this.config.env.JWT_ISSUER,
        audience: this.config.env.JWT_AUDIENCE,
        currentDate: this.clock.now(),
      });
      if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
        throw new Error('missing claims');
      }
      return {
        id: payload.sub,
        email: payload.email,
        role: EnumUtil.parse(UserRole, String(payload.role)),
      };
    } catch {
      throw new UnauthenticatedError('Invalid or expired access token');
    }
  }
}
