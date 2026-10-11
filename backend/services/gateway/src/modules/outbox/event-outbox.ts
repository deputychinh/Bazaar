import type { AnyEventEnvelope } from '@bazaar/contracts';

import type { Transaction } from '../../interfaces/transaction.interface.js';

/** Port: stores an event in the same transaction as the change it announces (plan DS-04). */
export abstract class EventOutbox {
  public abstract add(event: AnyEventEnvelope, transaction: Transaction): Promise<void>;
}
