import { EventFactory, EventType, PASSWORD_RESET_TTL_MINUTES, UserStatus } from '@bazaar/contracts';
import { Clock } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { UserTokenPurpose } from '../../../enums/user-token-purpose.enum.js';
import { TokenUtil } from '../../../utils/token.util.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { OneTimeTokenPolicy } from '../domain/one-time-token-policy.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import type { ResetPasswordDto } from '../dto/auth-request.dto.js';
import { InvalidTokenError } from '../errors/invalid-token.error.js';
import { RefreshTokensRepository } from '../repositories/refresh-tokens.repository.js';
import { UserTokensRepository } from '../repositories/user-tokens.repository.js';

import { AuthLinkBuilder } from './auth-link.builder.js';

const MS_PER_MINUTE = 60_000;

/** Forgot / reset password (plan F4). */
@Injectable()
export class PasswordResetService {
  public constructor(
    private readonly users: UsersRepository,
    private readonly userTokens: UserTokensRepository,
    private readonly refreshTokens: RefreshTokensRepository,
    private readonly hasher: PasswordHasher,
    private readonly outbox: EventOutbox,
    private readonly transactions: TransactionManager,
    private readonly links: AuthLinkBuilder,
    private readonly clock: Clock,
  ) {}

  /** Always succeeds so callers cannot learn which emails exist. */
  public async requestReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user === null || user.status === UserStatus.Suspended) {
      return;
    }
    const token = TokenUtil.generate();
    await this.transactions.run(async (transaction) => {
      await this.userTokens.create(
        {
          userId: user.id,
          purpose: UserTokenPurpose.PasswordReset,
          tokenHash: TokenUtil.hash(token),
          expiresAt: new Date(
            this.clock.now().getTime() + PASSWORD_RESET_TTL_MINUTES * MS_PER_MINUTE,
          ),
        },
        transaction,
      );
      await this.outbox.add(
        EventFactory.create({
          type: EventType.PasswordResetRequested,
          aggregateId: user.id,
          payload: {
            userId: user.id,
            email: user.email,
            preferredLocale: user.preferredLocale,
            link: this.links.resetPassword(user.preferredLocale, token),
          },
        }),
        transaction,
      );
    });
  }

  /** Sets the new password, proves the email and signs the user out everywhere. */
  public async reset(request: ResetPasswordDto): Promise<void> {
    const stored = await this.userTokens.findByHash(
      TokenUtil.hash(request.token),
      UserTokenPurpose.PasswordReset,
    );
    const now = this.clock.now();
    if (!OneTimeTokenPolicy.isUsable(stored, now)) {
      throw new InvalidTokenError('This reset link is invalid or has expired');
    }
    const user = await this.users.findById(stored.userId);
    const passwordHash = await this.hasher.hash(request.password);
    await this.transactions.run(async (transaction) => {
      await this.userTokens.markUsed(stored.id, transaction);
      await this.users.update(
        stored.userId,
        user?.status === UserStatus.PendingVerification
          ? { passwordHash, status: UserStatus.Active, emailVerifiedAt: now }
          : { passwordHash },
        transaction,
      );
      await this.refreshTokens.revokeAllForUser(stored.userId, transaction);
    });
  }
}
