import type { StoredUserToken } from '../../../interfaces/token.interface.js';

export class OneTimeTokenPolicy {
  /** A one-time token works once, before it expires. */
  public static isUsable(token: StoredUserToken | null, now: Date): token is StoredUserToken {
    return token !== null && token.usedAt === null && token.expiresAt.getTime() > now.getTime();
  }
}
