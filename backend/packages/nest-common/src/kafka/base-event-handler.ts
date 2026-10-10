import type { EventEnvelope, EventType } from '@bazaar/contracts';

import type { ProcessedEventStore } from './processed-event-store.js';

/**
 * Template method for every Kafka handler: idempotency first, then `process`.
 * Subclasses only implement the business reaction (plan §6A.3).
 */
export abstract class BaseEventHandler<
  TType extends EventType = EventType,
  TTransaction = unknown,
> {
  public abstract readonly eventType: TType;

  protected constructor(private readonly processedEvents: ProcessedEventStore<TTransaction>) {}

  public async handle(event: EventEnvelope<TType>): Promise<void> {
    await this.processedEvents.runOnce(event.eventId, (transaction) =>
      this.process(event, transaction),
    );
  }

  protected abstract process(event: EventEnvelope<TType>, transaction: TTransaction): Promise<void>;
}
