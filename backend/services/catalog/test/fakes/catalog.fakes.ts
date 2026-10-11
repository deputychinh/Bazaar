import { type AnyEventEnvelope, UserRole } from '@bazaar/contracts';
import {
  type AuthenticatedUser,
  EnumUtil,
  ProcessedEventStore,
  TokenVerifier,
  UnauthenticatedError,
} from '@bazaar/nest-common';

import { TransactionManager } from '../../src/common/transaction/transaction-manager.js';
import type { NewShop, Shop } from '../../src/interfaces/shop.interface.js';
import type { Transaction } from '../../src/interfaces/transaction.interface.js';
import { EventOutbox } from '../../src/modules/outbox/event-outbox.js';
import {
  type ShopChangesOptions,
  ShopsRepository,
} from '../../src/modules/shops/repositories/shops.repository.js';

export const NOW = new Date('2026-10-11T08:00:00.000Z');
export const NO_TRANSACTION = {} as Transaction;

/** Tokens in tests read "ROLE:userId", e.g. "SELLER:seller-1". */
export class FakeTokenVerifier extends TokenVerifier {
  public verify(token: string): Promise<AuthenticatedUser> {
    const [role, id] = token.split(':');
    if (role === undefined || id === undefined) {
      return Promise.reject(new UnauthenticatedError('bad test token'));
    }
    return Promise.resolve({
      id,
      email: `${id}@bazaar.test`,
      role: EnumUtil.parse(UserRole, role),
    });
  }
}

export const bearer = (role: UserRole, id: string): string => `Bearer ${role}:${id}`;

export class InMemoryProcessedEvents extends ProcessedEventStore<Transaction> {
  private readonly seen = new Set<string>();

  public async runOnce(
    eventId: string,
    work: (transaction: Transaction) => Promise<void>,
  ): Promise<boolean> {
    if (this.seen.has(eventId)) {
      return false;
    }
    await work(NO_TRANSACTION);
    this.seen.add(eventId);
    return true;
  }
}

export class InMemoryShopsRepository extends ShopsRepository {
  public readonly rows: Shop[] = [];

  public findBySlug(slug: string): Promise<Shop | null> {
    return Promise.resolve(this.rows.find((shop) => shop.slug === slug) ?? null);
  }

  public findBySellerId(sellerId: string): Promise<Shop | null> {
    return Promise.resolve(this.rows.find((shop) => shop.sellerId === sellerId) ?? null);
  }

  public create(shop: NewShop): Promise<Shop> {
    const row: Shop = {
      ...shop,
      id: `shop-${this.rows.length + 1}`,
      description: null,
      createdAt: NOW,
    };
    this.rows.push(row);
    return Promise.resolve(row);
  }

  public update(id: string, changes: ShopChangesOptions): Promise<Shop> {
    const row = this.rows.find((shop) => shop.id === id)!;
    Object.assign(row, changes);
    return Promise.resolve(row);
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
