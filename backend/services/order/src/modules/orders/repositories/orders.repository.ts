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
}
