import type { AnyEventEnvelope, EventEnvelope, EventType } from '@bazaar/contracts';
import { BaseEventHandler } from '@bazaar/nest-common';

import type { Transaction } from '../../interfaces/transaction.interface.js';

import type { EventReactions } from './event-reactions.js';
import type { PrismaProcessedEventStore } from './prisma-processed-event.store.js';

/**
 * The dispatcher allows one handler per event type, but this service reacts several ways to the
 * same event (log, contacts, email, in-app). One pipeline per type runs every reaction inside a
 * single idempotency transaction: all of them happen once, or none.
 */
export class PipelineHandler<TType extends EventType> extends BaseEventHandler<TType, Transaction> {
  public constructor(
    public readonly eventType: TType,
    processedEvents: PrismaProcessedEventStore,
    private readonly reactions: EventReactions,
  ) {
    super(processedEvents);
  }

  protected async process(event: EventEnvelope<TType>, transaction: Transaction): Promise<void> {
    for (const reaction of this.reactions.all) {
      await reaction.react(event as AnyEventEnvelope, transaction);
    }
  }
}
