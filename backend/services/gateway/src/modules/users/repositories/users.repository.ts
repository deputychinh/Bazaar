import type { UserRole, UserStatus } from '@bazaar/contracts';

import type { Transaction } from '../../../interfaces/transaction.interface.js';
import type { NewUser, User } from '../../../interfaces/user.interface.js';

export interface UserChangesOptions {
  status?: UserStatus;
  role?: UserRole;
  passwordHash?: string;
  emailVerifiedAt?: Date;
}

/** Port to the users table. */
export abstract class UsersRepository {
  public abstract findById(id: string, transaction?: Transaction): Promise<User | null>;

  public abstract findByEmail(email: string): Promise<User | null>;

  public abstract create(user: NewUser, transaction: Transaction): Promise<User>;

  public abstract update(
    id: string,
    changes: UserChangesOptions,
    transaction: Transaction,
  ): Promise<User>;
}
