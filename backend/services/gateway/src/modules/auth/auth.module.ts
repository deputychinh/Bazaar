import { Module } from '@nestjs/common';

import { PrismaTransactionManager } from '../../common/transaction/prisma-transaction-manager.js';
import { TransactionManager } from '../../common/transaction/transaction-manager.js';
import { Argon2PasswordHasher } from '../../infrastructure/crypto/argon2-password-hasher.js';
import { TokensModule } from '../tokens/tokens.module.js';
import { UsersModule } from '../users/users.module.js';

import { AuthController } from './controllers/auth.controller.js';
import { PasswordHasher } from './domain/password-hasher.js';
import { PrismaRefreshTokensRepository } from './repositories/prisma-refresh-tokens.repository.js';
import { PrismaUserTokensRepository } from './repositories/prisma-user-tokens.repository.js';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository.js';
import { UserTokensRepository } from './repositories/user-tokens.repository.js';
import { AuthLinkBuilder } from './services/auth-link.builder.js';
import { PasswordResetService } from './services/password-reset.service.js';
import { RegistrationService } from './services/registration.service.js';
import { SessionService } from './services/session.service.js';

@Module({
  imports: [UsersModule, TokensModule],
  controllers: [AuthController],
  providers: [
    RegistrationService,
    SessionService,
    PasswordResetService,
    AuthLinkBuilder,
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: RefreshTokensRepository, useClass: PrismaRefreshTokensRepository },
    { provide: UserTokensRepository, useClass: PrismaUserTokensRepository },
    { provide: TransactionManager, useClass: PrismaTransactionManager },
  ],
})
export class AuthModule {}
