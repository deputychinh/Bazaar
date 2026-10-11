import type { UserTokenPurpose } from '../../../enums/user-token-purpose.enum.js';
import type { StoredUserToken } from '../../../interfaces/token.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export interface NewUserTokenOptions {
  userId: string;
  purpose: UserTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
}

export abstract class UserTokensRepository {
  public abstract create(token: NewUserTokenOptions, transaction: Transaction): Promise<void>;

  public abstract findByHash(
    tokenHash: string,
    purpose: UserTokenPurpose,
  ): Promise<StoredUserToken | null>;

  public abstract markUsed(id: string, transaction: Transaction): Promise<void>;
}
