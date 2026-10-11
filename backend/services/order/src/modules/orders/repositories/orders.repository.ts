import type { OrderStatus } from '@bazaar/contracts';

import type {
  OrderTransition,
  SellerOrderTransition,
} from '../../../interfaces/order-transition.interface.js';
import type { NewOrder, Order } from '../../../interfaces/order.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export abstract class OrdersRepository {
  /**
   * Inserts the order with its seller orders, items and payment. Throws
   * DuplicateIdempotencyKeyError when this shopper already used the key.
   */
  public abstract create(order: NewOrder, transaction: Transaction): Promise<Order>;

  public abstract findById(id: string, transaction?: Transaction): Promise<Order | null>;

  public abstract findByIdempotencyKey(shopperId: string, key: string): Promise<Order | null>;

  /** False when the order already left every allowed source status (someone else moved it). */
  public abstract transition(change: OrderTransition, transaction: Transaction): Promise<boolean>;

  /** Same rule for one seller order. */
  public abstract transitionSellerOrder(
    change: SellerOrderTransition,
    transaction: Transaction,
  ): Promise<boolean>;

  /** Records a payment outcome that does not move the order (e.g. refund pending). */
  public abstract updatePayment(
    orderId: string,
    payment: NonNullable<OrderTransition['payment']>,
    transaction: Transaction,
  ): Promise<void>;

  /** Orders still in `statuses` created before `before`, oldest first (timeout and retry jobs). */
  public abstract findStale(statuses: OrderStatus[], before: Date, limit: number): Promise<Order[]>;
}
