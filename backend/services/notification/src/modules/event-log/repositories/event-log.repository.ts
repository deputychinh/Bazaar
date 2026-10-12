import type { EventType } from '@bazaar/contracts';

import type { EventLogEntry } from '../../../interfaces/event-log-entry.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export abstract class EventLogRepository {
  public abstract append(entry: EventLogEntry, transaction: Transaction): Promise<void>;

  /** Newest first, optionally one event type and/or one aggregate (e.g. an order id). */
  public abstract search(filter: {
    type?: EventType;
    aggregateId?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: EventLogEntry[]; total: number }>;
}
