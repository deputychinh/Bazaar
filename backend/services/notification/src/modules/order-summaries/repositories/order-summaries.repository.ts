import type { OrderSummary } from '../../../interfaces/order-summary.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export abstract class OrderSummariesRepository {
  public abstract save(summary: OrderSummary, transaction: Transaction): Promise<void>;

  public abstract find(orderId: string, transaction?: Transaction): Promise<OrderSummary | null>;
}
