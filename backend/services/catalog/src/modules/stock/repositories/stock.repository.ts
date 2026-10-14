import type { StockLine, StockReservation } from '../../../interfaces/stock.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

/** Port to variant stock and reservations; every call joins the caller's transaction. */
export abstract class StockRepository {
  /** Takes `quantity` only if that much is left (atomic conditional decrement). */
  public abstract tryTake(line: StockLine, transaction: Transaction): Promise<boolean>;

  public abstract giveBack(line: StockLine, transaction: Transaction): Promise<void>;

  /** Counts the units of a confirmed order as sold (the storefront's "sold" figure). */
  public abstract addSold(line: StockLine, transaction: Transaction): Promise<void>;

  /** Units left of a variant (0 when the product or variant is gone). */
  public abstract available(line: StockLine, transaction: Transaction): Promise<number>;

  public abstract findReservation(
    orderId: string,
    transaction: Transaction,
  ): Promise<StockReservation | null>;

  public abstract saveReservation(
    reservation: StockReservation,
    transaction: Transaction,
  ): Promise<void>;

  /** Slugs of products, to drop their cached pages after a stock change. */
  public abstract slugsOf(productIds: string[]): Promise<string[]>;
}
