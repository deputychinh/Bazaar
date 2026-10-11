import { Module } from '@nestjs/common';

import { JwksController } from './controllers/jwks.controller.js';
import { AccessTokenService } from './services/access-token.service.js';
import { KeyStore } from './services/key-store.js';

@Module({
  controllers: [JwksController],
  providers: [KeyStore, AccessTokenService],
  exports: [AccessTokenService, KeyStore],
})
export class TokensModule {}
