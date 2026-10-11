import { createHash, randomBytes } from 'node:crypto';

import { OPAQUE_TOKEN_BYTES } from '../constants/auth.constant.js';

/** Opaque one-time tokens: the raw value goes to the user, only the hash is stored. */
export class TokenUtil {
  public static generate(): string {
    return randomBytes(OPAQUE_TOKEN_BYTES).toString('base64url');
  }

  public static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
