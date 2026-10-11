import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

/**
 * Port: turns a bearer token into the caller. The gateway verifies with its own key;
 * other services verify with the gateway's published JWKS (zero-trust, plan §2B Auth).
 */
export abstract class TokenVerifier {
  public abstract verify(token: string): Promise<AuthenticatedUser>;
}
