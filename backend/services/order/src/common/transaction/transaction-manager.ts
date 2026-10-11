import type { Transaction } from '../../interfaces/transaction.interface.js';

/** Port: runs work atomically; repositories join through the `transaction` handle. */
export abstract class TransactionManager {
  public abstract run<T>(work: (transaction: Transaction) => Promise<T>): Promise<T>;
}
