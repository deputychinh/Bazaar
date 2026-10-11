import { type AnyEventEnvelope, EVENT_TOPIC } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import type { EventReaction } from '../../../interfaces/event-reaction.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { EventLogRepository } from '../repositories/event-log.repository.js';

/** Appends every event to the log the admin reads (plan F12); the event id keeps it once. */
@Injectable()
export class EventLogReaction implements EventReaction {
  public readonly name = 'event-log';

  public constructor(private readonly log: EventLogRepository) {}

  public async react(event: AnyEventEnvelope, transaction: Transaction): Promise<void> {
    await this.log.append(
      {
        eventId: event.eventId,
        type: event.type,
        topic: EVENT_TOPIC[event.type],
        aggregateId: event.aggregateId,
        occurredAt: new Date(event.occurredAt),
        payload: event.payload as unknown as Record<string, unknown>,
      },
      transaction,
    );
  }
}
