import { randomUUID } from 'node:crypto';

import { EVENT_SCHEMA_VERSION } from '../constants/kafka.constant';
import type { EventType } from '../enums/event-type.enum';
import type { EventEnvelope, EventPayloadMap } from '../interfaces/event-envelope.interface';

export interface CreateEventOptions<TType extends EventType> {
  type: TType;
  aggregateId: string;
  payload: EventPayloadMap[TType];
  traceId?: string | null;
  eventId?: string;
  occurredAt?: Date;
}

/** Builds event envelopes so ids, version and timestamps are always set the same way. */
export class EventFactory {
  public static create<TType extends EventType>(
    options: CreateEventOptions<TType>,
  ): EventEnvelope<TType> {
    return {
      eventId: options.eventId ?? randomUUID(),
      type: options.type,
      version: EVENT_SCHEMA_VERSION,
      occurredAt: (options.occurredAt ?? new Date()).toISOString(),
      aggregateId: options.aggregateId,
      traceId: options.traceId ?? null,
      payload: options.payload,
    };
  }
}
