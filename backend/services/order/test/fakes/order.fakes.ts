import { randomUUID } from 'node:crypto';

import {
  type AnyEventEnvelope,
  OrderStatus,
  PaymentStatus,
  type PricedOrderLine,
  SellerOrderStatus,
  UserRole,
} from '@bazaar/contracts';
import {
  type AuthenticatedUser,
  EnumUtil,
  TokenVerifier,
  UnauthenticatedError,
} from '@bazaar/nest-common';

import { TransactionManager } from '../../src/common/transaction/transaction-manager.js';
import { AppConfig } from '../../src/config/app-config.js';
import { orderEnvSchema } from '../../src/config/env.schema.js';
import type { NewOrder, Order } from '../../src/interfaces/order.interface.js';
import type { Transaction } from '../../src/interfaces/transaction.interface.js';
import { DuplicateIdempotencyKeyError } from '../../src/modules/orders/errors/duplicate-idempotency-key.error.js';
import { OrdersRepository } from '../../src/modules/orders/repositories/orders.repository.js';
import { EventOutbox } from '../../src/modules/outbox/event-outbox.js';

export const NOW = new Date('2026-10-11T08:00:00.000Z');
export const NO_TRANSACTION = {} as Transaction;
export const TEST_INTERNAL_KEY = 'internal-test-key-0123456789abcdef';

export const testConfig = (): AppConfig =>
  new AppConfig(
    orderEnvSchema.parse({
      ORDER_DATABASE_URL: 'mysql://test',
      REDIS_URL: 'redis://test',
      KAFKA_BROKERS: 'localhost:9094',
      INTERNAL_API_KEY: TEST_INTERNAL_KEY,
    }),
  );

/** Tokens in tests read "ROLE:userId", e.g. "SHOPPER:shopper-1". */
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

export const pricedLine = (overrides: Partial<PricedOrderLine> = {}): PricedOrderLine => ({
  productId: 'p1',
  productSlug: 'silk-lantern',
  variantSku: 'LAN-RED',
  quantity: 1,
  sellerId: 'seller-1',
  shopId: 'shop-1',
  shopName: 'Hội An Lights',
  title: { en: 'Silk lantern', vi: 'Đèn lồng lụa' },
  variantLabel: 'Red',
  imageUrl: null,
  unitPriceUsdCents: 1500,
  ...overrides,
});

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

/** Orders in memory with the same uniqueness rule as MySQL (shopper + idempotency key). */
export class InMemoryOrdersRepository extends OrdersRepository {
  public readonly rows: Order[] = [];

  public create(order: NewOrder): Promise<Order> {
    if (
      this.rows.some(
        (row) => row.shopperId === order.shopperId && row.idempotencyKey === order.idempotencyKey,
      )
    ) {
      return Promise.reject(new DuplicateIdempotencyKeyError('Idempotency-Key already used'));
    }
    const id = randomUUID();
    const created: Order = {
      id,
      shopperId: order.shopperId,
      status: OrderStatus.Pending,
      totalUsdCents: order.totalUsdCents,
      cancelReason: null,
      idempotencyKey: order.idempotencyKey,
      createdAt: NOW,
      updatedAt: NOW,
      payment: {
        id: randomUUID(),
        status: PaymentStatus.Pending,
        providerToken: order.payment.providerToken,
        providerRef: null,
        cardLast4: order.payment.cardLast4,
        amountUsdCents: order.totalUsdCents,
        failureReason: null,
      },
      sellerOrders: order.sellerOrders.map((sellerOrder) => ({
        id: randomUUID(),
        orderId: id,
        sellerId: sellerOrder.sellerId,
        shopId: sellerOrder.shopId,
        shopName: sellerOrder.shopName,
        status: SellerOrderStatus.Pending,
        subtotalUsdCents: sellerOrder.subtotalUsdCents,
        cancelReason: null,
        shippedAt: null,
        deliveredAt: null,
        cancelledAt: null,
        items: sellerOrder.items.map((item) => ({ ...item, id: randomUUID() })),
      })),
    };
    this.rows.push(created);
    return Promise.resolve(structuredClone(created));
  }

  public findById(id: string): Promise<Order | null> {
    const row = this.rows.find((candidate) => candidate.id === id);
    return Promise.resolve(row === undefined ? null : structuredClone(row));
  }

  public findByIdempotencyKey(shopperId: string, key: string): Promise<Order | null> {
    const row = this.rows.find(
      (candidate) => candidate.shopperId === shopperId && candidate.idempotencyKey === key,
    );
    return Promise.resolve(row === undefined ? null : structuredClone(row));
  }
}
