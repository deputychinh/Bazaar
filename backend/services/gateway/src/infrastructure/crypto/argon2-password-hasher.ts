import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

import { ARGON2ID_ALGORITHM } from '../../constants/auth.constant.js';
import { PasswordHasher } from '../../modules/auth/domain/password-hasher.js';

/** argon2id with the library defaults (19 MiB, 2 iterations) — OWASP minimum. */
@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  public hash(password: string): Promise<string> {
    return hash(password, { algorithm: ARGON2ID_ALGORITHM });
  }

  public verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
