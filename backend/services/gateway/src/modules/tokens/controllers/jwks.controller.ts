import { Public } from '@bazaar/nest-common';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { JWK } from 'jose';

import { JWKS_PATH } from '../../../constants/auth.constant.js';
import { KeyStore } from '../services/key-store.js';

/** Public key set so other services verify access tokens themselves (zero-trust). */
@ApiTags('auth')
@Controller()
export class JwksController {
  public constructor(private readonly keys: KeyStore) {}

  @Public()
  @Get(JWKS_PATH)
  public jwks(): { keys: JWK[] } {
    return this.keys.jwks();
  }
}
