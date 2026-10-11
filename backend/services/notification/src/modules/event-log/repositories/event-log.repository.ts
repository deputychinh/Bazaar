import type { EventLogEntry } from '../../../interfaces/event-log-entry.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export abstract class EventLogRepository {
  public abstract append(entry: EventLogEntry, transaction: Transaction): Promise<void>;
}
