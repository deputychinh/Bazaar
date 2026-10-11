import type { UserRole } from '@bazaar/contracts';
import {
  AppLoggerModule,
  Clock,
  FixedClock,
  HttpCommonModule,
  LogLevel,
} from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';

import { JwtAuthGuard } from '../../src/common/guards/jwt-auth.guard.js';
import { RateLimitGuard } from '../../src/common/guards/rate-limit.guard.js';
import { RolesGuard } from '../../src/common/guards/roles.guard.js';
import { TransactionManager } from '../../src/common/transaction/transaction-manager.js';
import { AppConfig } from '../../src/config/app-config.js';
import { API_PREFIX } from '../../src/constants/gateway.constant.js';
import { AuthController } from '../../src/modules/auth/controllers/auth.controller.js';
import { PasswordHasher } from '../../src/modules/auth/domain/password-hasher.js';
import { RefreshTokensRepository } from '../../src/modules/auth/repositories/refresh-tokens.repository.js';
import { UserTokensRepository } from '../../src/modules/auth/repositories/user-tokens.repository.js';
import { AuthLinkBuilder } from '../../src/modules/auth/services/auth-link.builder.js';
import { PasswordResetService } from '../../src/modules/auth/services/password-reset.service.js';
import { RegistrationService } from '../../src/modules/auth/services/registration.service.js';
import { SessionService } from '../../src/modules/auth/services/session.service.js';
import { EventOutbox } from '../../src/modules/outbox/event-outbox.js';
import { RateLimiter } from '../../src/modules/rate-limit/rate-limiter.js';
import { AdminSellerApplicationsController } from '../../src/modules/sellers/controllers/admin-seller-applications.controller.js';
import { SellerApplicationsController } from '../../src/modules/sellers/controllers/seller-applications.controller.js';
import { SellerApplicationsRepository } from '../../src/modules/sellers/repositories/seller-applications.repository.js';
import { SellerApplicationsService } from '../../src/modules/sellers/services/seller-applications.service.js';
import { JwksController } from '../../src/modules/tokens/controllers/jwks.controller.js';
import { AccessTokenService } from '../../src/modules/tokens/services/access-token.service.js';
import { KeyStore } from '../../src/modules/tokens/services/key-store.js';
import { UsersRepository } from '../../src/modules/users/repositories/users.repository.js';

import {
  buildAccessTokenService,
  FakePasswordHasher,
  ImmediateTransactionManager,
  InMemoryRateLimiter,
  InMemoryRefreshTokensRepository,
  InMemorySellerApplicationsRepository,
  InMemoryUsersRepository,
  InMemoryUserTokensRepository,
  NOW,
  RecordingOutbox,
  testConfig,
} from './auth.fakes.js';

export interface GatewayTestApp {
  app: INestApplication;
  users: InMemoryUsersRepository;
  outbox: RecordingOutbox;
  refreshTokens: InMemoryRefreshTokensRepository;
  applications: InMemorySellerApplicationsRepository;
  /** Signs in a seeded user and returns an Authorization header value. */
  bearerFor: (user: { id: string; email: string; role: UserRole }) => Promise<string>;
}

/** The real HTTP layer (controllers, guards, pipes, error filter) over in-memory adapters. */
export const createGatewayTestApp = async (): Promise<GatewayTestApp> => {
  const users = new InMemoryUsersRepository();
  const outbox = new RecordingOutbox();
  const refreshTokens = new InMemoryRefreshTokensRepository();
  const applications = new InMemorySellerApplicationsRepository();
  const clock = new FixedClock(NOW);
  const tokens = await buildAccessTokenService(clock);
  const moduleRef = await Test.createTestingModule({
    imports: [
      AppLoggerModule.forRoot({ serviceName: 'test', level: LogLevel.Silent, pretty: false }),
      HttpCommonModule,
    ],
    controllers: [
      AuthController,
      JwksController,
      SellerApplicationsController,
      AdminSellerApplicationsController,
    ],
    providers: [
      RegistrationService,
      SessionService,
      PasswordResetService,
      AuthLinkBuilder,
      SellerApplicationsService,
      { provide: SellerApplicationsRepository, useValue: applications },
      { provide: AppConfig, useValue: testConfig() },
      { provide: Clock, useValue: clock },
      { provide: KeyStore, useValue: tokens.keys },
      { provide: AccessTokenService, useValue: tokens.service },
      { provide: UsersRepository, useValue: users },
      { provide: UserTokensRepository, useValue: new InMemoryUserTokensRepository() },
      { provide: RefreshTokensRepository, useValue: refreshTokens },
      { provide: PasswordHasher, useValue: new FakePasswordHasher() },
      { provide: EventOutbox, useValue: outbox },
      { provide: TransactionManager, useValue: new ImmediateTransactionManager() },
      { provide: RateLimiter, useValue: new InMemoryRateLimiter() },
      { provide: APP_GUARD, useClass: RateLimitGuard },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix(API_PREFIX, { exclude: ['.well-known/jwks.json'] });
  await app.init();
  const bearerFor = async (user: { id: string; email: string; role: UserRole }): Promise<string> =>
    `Bearer ${(await tokens.service.sign(user)).accessToken}`;
  return { app, users, outbox, refreshTokens, applications, bearerFor };
};
