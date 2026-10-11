import { REFRESH_TOKEN_TTL_DAYS, UserStatus } from '@bazaar/contracts';
import { Clock, UnauthenticatedError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { TIMING_SAFE_DUMMY_HASH } from '../../../constants/auth.constant.js';
import { RefreshTokenState } from '../../../enums/refresh-token-state.enum.js';
import type { IssuedSession } from '../../../interfaces/session.interface.js';
import type { User } from '../../../interfaces/user.interface.js';
import { TokenUtil } from '../../../utils/token.util.js';
import { AccessTokenService } from '../../tokens/services/access-token.service.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import { RefreshTokenPolicy } from '../domain/refresh-token-policy.js';
import type { LoginDto } from '../dto/auth-request.dto.js';
import { AccountSuspendedError } from '../errors/account-suspended.error.js';
import { EmailNotVerifiedError } from '../errors/email-not-verified.error.js';
import { InvalidCredentialsError } from '../errors/invalid-credentials.error.js';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository.js';

const MS_PER_DAY = 86_400_000;

/** Login, refresh-token rotation and logout (plan §2B Auth). */
@Injectable()
export class SessionService {
  public constructor(
    private readonly users: UsersRepository,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly hasher: PasswordHasher,
    private readonly accessTokens: AccessTokenService,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  public async login(request: LoginDto): Promise<IssuedSession> {
    const user = await this.users.findByEmail(request.email);
    const isValid = await this.hasher.verify(
      user?.passwordHash ?? TIMING_SAFE_DUMMY_HASH,
      request.password,
    );
    if (user === null || !isValid) {
      throw new InvalidCredentialsError('Email or password is incorrect');
    }
    SessionService.assertCanSignIn(user);
    const refreshToken = TokenUtil.generate();
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: TokenUtil.hash(refreshToken),
      familyId: crypto.randomUUID(),
      expiresAt: this.refreshExpiry(),
    });
    return { ...(await this.accessTokens.sign(user)), refreshToken, user };
  }

  public async refresh(presentedToken: string): Promise<IssuedSession> {
    const stored = await this.refreshTokens.findByHash(TokenUtil.hash(presentedToken));
    const state = RefreshTokenPolicy.evaluate(stored, this.clock.now());
    if (state === RefreshTokenState.Reused && stored !== null) {
      await this.refreshTokens.revokeFamily(stored.familyId);
    }
    if (state !== RefreshTokenState.Valid || stored === null) {
      throw new UnauthenticatedError('Session expired, please sign in again');
    }
    const user = await this.users.findById(stored.userId);
    if (user === null) {
      throw new UnauthenticatedError('Session expired, please sign in again');
    }
    SessionService.assertCanSignIn(user);
    const refreshToken = TokenUtil.generate();
    await this.transactions.run(async (transaction) => {
      const next = await this.refreshTokens.create(
        {
          userId: user.id,
          tokenHash: TokenUtil.hash(refreshToken),
          familyId: stored.familyId,
          expiresAt: this.refreshExpiry(),
        },
        transaction,
      );
      await this.refreshTokens.markRotated(stored.id, next.id, transaction);
    });
    return { ...(await this.accessTokens.sign(user)), refreshToken, user };
  }

  public async logout(presentedToken: string | undefined): Promise<void> {
    if (presentedToken === undefined) {
      return;
    }
    const stored = await this.refreshTokens.findByHash(TokenUtil.hash(presentedToken));
    if (stored !== null) {
      await this.refreshTokens.revokeFamily(stored.familyId);
    }
  }

  private refreshExpiry(): Date {
    return new Date(this.clock.now().getTime() + REFRESH_TOKEN_TTL_DAYS * MS_PER_DAY);
  }

  private static assertCanSignIn(user: User): void {
    if (user.status === UserStatus.PendingVerification) {
      throw new EmailNotVerifiedError('Please verify your email before signing in');
    }
    if (user.status === UserStatus.Suspended) {
      throw new AccountSuspendedError('This account is suspended');
    }
  }
}
