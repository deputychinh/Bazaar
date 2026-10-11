import { randomUUID } from 'node:crypto';

import {
  type AnyEventEnvelope,
  Locale,
  type Page,
  type SellerApplicationStatus,
  UserRole,
  UserStatus,
} from '@bazaar/contracts';
import { FixedClock } from '@bazaar/nest-common';
import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose';

import { TransactionManager } from '../../src/common/transaction/transaction-manager.js';
import { AppConfig } from '../../src/config/app-config.js';
import { gatewayEnvSchema } from '../../src/config/env.schema.js';
import type { UserTokenPurpose } from '../../src/enums/user-token-purpose.enum.js';
import type { SellerApplication } from '../../src/interfaces/seller-application.interface.js';
import type { StoredRefreshToken, StoredUserToken } from '../../src/interfaces/token.interface.js';
import type { Transaction } from '../../src/interfaces/transaction.interface.js';
import type { NewUser, User } from '../../src/interfaces/user.interface.js';
import { PasswordHasher } from '../../src/modules/auth/domain/password-hasher.js';
import {
  type NewRefreshTokenOptions,
  RefreshTokensRepository,
} from '../../src/modules/auth/repositories/refresh-tokens.repository.js';
import {
  type NewUserTokenOptions,
  UserTokensRepository,
} from '../../src/modules/auth/repositories/user-tokens.repository.js';
import { EventOutbox } from '../../src/modules/outbox/event-outbox.js';
import {
  type ListApplicationsOptions,
  type ReviewOptions,
  SellerApplicationsRepository,
} from '../../src/modules/sellers/repositories/seller-applications.repository.js';
import { AccessTokenService } from '../../src/modules/tokens/services/access-token.service.js';
import { KeyStore } from '../../src/modules/tokens/services/key-store.js';
import {
  type UserChangesOptions,
  UsersRepository,
} from '../../src/modules/users/repositories/users.repository.js';

export const NOW = new Date('2026-10-11T08:00:00.000Z');
const NO_TRANSACTION = {} as Transaction;

export const testConfig = (): AppConfig =>
  new AppConfig(
    gatewayEnvSchema.parse({
      IDENTITY_DATABASE_URL: 'mysql://test@localhost/test',
      REDIS_URL: 'redis://localhost',
      KAFKA_BROKERS: 'localhost:9094',
      WEB_APP_URL: 'https://bazaar.test',
    }),
  );

export class InMemoryUsersRepository extends UsersRepository {
  public readonly rows = new Map<string, User>();

  public seed(overrides: Partial<User> = {}): User {
    const user: User = {
      id: randomUUID(),
      email: `user-${this.rows.size}@bazaar.test`,
      passwordHash: 'hashed:Correct-Horse-9',
      role: UserRole.Shopper,
      status: UserStatus.Active,
      preferredLocale: Locale.En,
      emailVerifiedAt: NOW,
      createdAt: NOW,
      ...overrides,
    };
    this.rows.set(user.id, user);
    return user;
  }

  public findById(id: string): Promise<User | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }

  public findByEmail(email: string): Promise<User | null> {
    return Promise.resolve([...this.rows.values()].find((user) => user.email === email) ?? null);
  }

  public create(user: NewUser): Promise<User> {
    return Promise.resolve(this.seed({ ...user, emailVerifiedAt: null }));
  }

  public update(id: string, changes: UserChangesOptions): Promise<User> {
    const user = { ...this.rows.get(id)!, ...changes };
    this.rows.set(id, user);
    return Promise.resolve(user);
  }
}

export class InMemoryUserTokensRepository extends UserTokensRepository {
  public readonly rows: (StoredUserToken & { purpose: UserTokenPurpose; tokenHash: string })[] = [];

  public create(token: NewUserTokenOptions): Promise<void> {
    this.rows.push({ ...token, id: randomUUID(), usedAt: null });
    return Promise.resolve();
  }

  public findByHash(tokenHash: string, purpose: UserTokenPurpose): Promise<StoredUserToken | null> {
    const row = this.rows.find(
      (token) => token.tokenHash === tokenHash && token.purpose === purpose,
    );
    return Promise.resolve(row ?? null);
  }

  public markUsed(id: string): Promise<void> {
    this.rows.find((token) => token.id === id)!.usedAt = NOW;
    return Promise.resolve();
  }
}

export class InMemoryRefreshTokensRepository extends RefreshTokensRepository {
  public readonly rows: (StoredRefreshToken & { tokenHash: string })[] = [];

  public create(token: NewRefreshTokenOptions): Promise<StoredRefreshToken> {
    const row = { ...token, id: randomUUID(), revokedAt: null };
    this.rows.push(row);
    return Promise.resolve(row);
  }

  public findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return Promise.resolve(this.rows.find((token) => token.tokenHash === tokenHash) ?? null);
  }

  public markRotated(id: string): Promise<void> {
    this.rows.find((token) => token.id === id)!.revokedAt = NOW;
    return Promise.resolve();
  }

  public revokeFamily(familyId: string): Promise<void> {
    this.rows
      .filter((token) => token.familyId === familyId)
      .forEach((token) => (token.revokedAt = NOW));
    return Promise.resolve();
  }

  public revokeAllForUser(userId: string): Promise<void> {
    this.rows
      .filter((token) => token.userId === userId)
      .forEach((token) => (token.revokedAt = NOW));
    return Promise.resolve();
  }
}

export class FakePasswordHasher extends PasswordHasher {
  public readonly verified: string[] = [];

  public hash(password: string): Promise<string> {
    return Promise.resolve(`hashed:${password}`);
  }

  public verify(hash: string, password: string): Promise<boolean> {
    this.verified.push(hash);
    return Promise.resolve(hash === `hashed:${password}`);
  }
}

export class RecordingOutbox extends EventOutbox {
  public readonly events: AnyEventEnvelope[] = [];

  public add(event: AnyEventEnvelope): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

export class ImmediateTransactionManager extends TransactionManager {
  public run<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
    return work(NO_TRANSACTION);
  }
}

export const buildAccessTokenService = async (
  clock = new FixedClock(NOW),
): Promise<{ service: AccessTokenService; keys: KeyStore; clock: FixedClock }> => {
  const config = testConfig();
  const keys = new KeyStore(config);
  const pair = await generateKeyPair('RS256', { extractable: true });
  await keys.use(await exportPKCS8(pair.privateKey), await exportSPKI(pair.publicKey));
  return { service: new AccessTokenService(keys, config, clock), keys, clock };
};

/** Pulls the raw token out of a link in an outbox event. */
export const tokenFromLink = (event: AnyEventEnvelope | undefined): string => {
  const link = event !== undefined && 'link' in event.payload ? event.payload.link : '';
  return new URL(link).searchParams.get('token') ?? '';
};

export class InMemorySellerApplicationsRepository extends SellerApplicationsRepository {
  public readonly rows: SellerApplication[] = [];

  public create(
    userId: string,
    shopName: string,
    status: SellerApplicationStatus,
  ): Promise<SellerApplication> {
    const row: SellerApplication = {
      // Zero-padded counter keeps ids sortable like UUID v7.
      id: `app-${String(this.rows.length).padStart(4, '0')}`,
      userId,
      shopName,
      status,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: NOW,
    };
    this.rows.push(row);
    return Promise.resolve(row);
  }

  public findById(id: string): Promise<SellerApplication | null> {
    return Promise.resolve(this.rows.find((row) => row.id === id) ?? null);
  }

  public findByUser(userId: string): Promise<SellerApplication[]> {
    return Promise.resolve(this.rows.filter((row) => row.userId === userId));
  }

  public list(options: ListApplicationsOptions): Promise<Page<SellerApplication>> {
    const matching = [...this.rows]
      .reverse()
      .filter((row) => options.status === undefined || row.status === options.status)
      .filter((row) => options.cursor === undefined || row.id < options.cursor);
    const items = matching.slice(0, options.limit);
    return Promise.resolve({
      items,
      nextCursor: matching.length > options.limit ? (items.at(-1)?.id ?? null) : null,
    });
  }

  public review(id: string, review: ReviewOptions): Promise<SellerApplication> {
    const row = this.rows.find((application) => application.id === id)!;
    Object.assign(row, { rejectionReason: null, ...review });
    return Promise.resolve(row);
  }
}
