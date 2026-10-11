import { RefreshTokenState } from '../../../enums/refresh-token-state.enum.js';
import type { StoredRefreshToken } from '../../../interfaces/token.interface.js';

/** Decides what a presented refresh token means (plan §2B Auth: rotation + reuse detection). */
export class RefreshTokenPolicy {
  public static evaluate(token: StoredRefreshToken | null, now: Date): RefreshTokenState {
    if (token === null) {
      return RefreshTokenState.Unknown;
    }
    if (token.revokedAt !== null) {
      // A rotated token presented again means it was stolen: revoke the whole family.
      return RefreshTokenState.Reused;
    }
    if (token.expiresAt.getTime() <= now.getTime()) {
      return RefreshTokenState.Expired;
    }
    return RefreshTokenState.Valid;
  }
}
