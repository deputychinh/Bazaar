import type { StoredRefreshToken } from '../../../interfaces/token.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export interface NewRefreshTokenOptions {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}

export abstract class RefreshTokensRepository {
  public abstract create(
    token: NewRefreshTokenOptions,
    transaction?: Transaction,
  ): Promise<StoredRefreshToken>;

  public abstract findByHash(tokenHash: string): Promise<StoredRefreshToken | null>;

  public abstract markRotated(
    id: string,
    replacedById: string,
    transaction: Transaction,
  ): Promise<void>;

  public abstract revokeFamily(familyId: string): Promise<void>;

  public abstract revokeAllForUser(userId: string, transaction: Transaction): Promise<void>;
}
