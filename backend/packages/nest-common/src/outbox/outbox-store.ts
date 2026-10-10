import type { OutboxMessage } from '../interfaces/outbox-message.interface.js';

/** Port to a service's outbox table/collection (plan DS-04). */
export abstract class OutboxStore {
  public abstract fetchUnsent(limit: number): Promise<OutboxMessage[]>;

  public abstract markSent(ids: string[]): Promise<void>;
}
