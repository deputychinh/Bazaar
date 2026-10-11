import {
  EMAIL_VERIFICATION_TTL_HOURS,
  EventFactory,
  EventType,
  UserRole,
  UserStatus,
} from '@bazaar/contracts';
import { Clock } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { UserTokenPurpose } from '../../../enums/user-token-purpose.enum.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import type { User } from '../../../interfaces/user.interface.js';
import { TokenUtil } from '../../../utils/token.util.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { OneTimeTokenPolicy } from '../domain/one-time-token-policy.js';
import { PasswordHasher } from '../domain/password-hasher.js';
import type { RegisterDto } from '../dto/auth-request.dto.js';
import { EmailAlreadyRegisteredError } from '../errors/email-already-registered.error.js';
import { InvalidTokenError } from '../errors/invalid-token.error.js';
import { UserTokensRepository } from '../repositories/user-tokens.repository.js';

import { AuthLinkBuilder } from './auth-link.builder.js';

const MS_PER_HOUR = 3_600_000;

/** Sign-up and email verification (plan F4). */
@Injectable()
export class RegistrationService {
  public constructor(
    private readonly users: UsersRepository,
    private readonly userTokens: UserTokensRepository,
    private readonly hasher: PasswordHasher,
    private readonly outbox: EventOutbox,
    private readonly transactions: TransactionManager,
    private readonly links: AuthLinkBuilder,
    private readonly clock: Clock,
  ) {}

  public async register(request: RegisterDto): Promise<User> {
    if ((await this.users.findByEmail(request.email)) !== null) {
      throw new EmailAlreadyRegisteredError('This email is already registered');
    }
    const passwordHash = await this.hasher.hash(request.password);
    return this.transactions.run(async (transaction) => {
      const user = await this.users.create(
        {
          email: request.email,
          passwordHash,
          role: UserRole.Shopper,
          status: UserStatus.PendingVerification,
          preferredLocale: request.preferredLocale,
        },
        transaction,
      );
      await this.outbox.add(
        EventFactory.create({
          type: EventType.UserRegistered,
          aggregateId: user.id,
          payload: { userId: user.id, email: user.email, preferredLocale: user.preferredLocale },
        }),
        transaction,
      );
      await this.sendVerification(user, transaction);
      return user;
    });
  }

  public async verifyEmail(token: string): Promise<void> {
    const stored = await this.userTokens.findByHash(
      TokenUtil.hash(token),
      UserTokenPurpose.EmailVerification,
    );
    const now = this.clock.now();
    if (!OneTimeTokenPolicy.isUsable(stored, now)) {
      throw new InvalidTokenError('This verification link is invalid or has expired');
    }
    await this.transactions.run(async (transaction) => {
      await this.userTokens.markUsed(stored.id, transaction);
      await this.users.update(
        stored.userId,
        { status: UserStatus.Active, emailVerifiedAt: now },
        transaction,
      );
    });
  }

  /** Always succeeds so callers cannot learn which emails exist. */
  public async resendVerification(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user?.status !== UserStatus.PendingVerification) {
      return;
    }
    await this.transactions.run((transaction) => this.sendVerification(user, transaction));
  }

  private async sendVerification(user: User, transaction: Transaction): Promise<void> {
    const token = TokenUtil.generate();
    await this.userTokens.create(
      {
        userId: user.id,
        purpose: UserTokenPurpose.EmailVerification,
        tokenHash: TokenUtil.hash(token),
        expiresAt: new Date(
          this.clock.now().getTime() + EMAIL_VERIFICATION_TTL_HOURS * MS_PER_HOUR,
        ),
      },
      transaction,
    );
    await this.outbox.add(
      EventFactory.create({
        type: EventType.EmailVerificationRequested,
        aggregateId: user.id,
        payload: {
          userId: user.id,
          email: user.email,
          preferredLocale: user.preferredLocale,
          link: this.links.verifyEmail(user.preferredLocale, token),
        },
      }),
      transaction,
    );
  }
}
