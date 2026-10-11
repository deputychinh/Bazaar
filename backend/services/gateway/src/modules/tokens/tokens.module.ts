import { TokenVerifier } from '@bazaar/nest-common';
import { Module } from '@nestjs/common';

import { JwksController } from './controllers/jwks.controller.js';
import { AccessTokenService } from './services/access-token.service.js';
import { KeyStore } from './services/key-store.js';

@Module({
  controllers: [JwksController],
  providers: [
    KeyStore,
    AccessTokenService,
    { provide: TokenVerifier, useExisting: AccessTokenService },
  ],
  exports: [AccessTokenService, KeyStore, TokenVerifier],
})
export class TokensModule {}
