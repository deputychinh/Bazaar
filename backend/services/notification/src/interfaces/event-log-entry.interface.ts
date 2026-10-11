import type { EventType } from '@bazaar/contracts';

export interface EventLogEntry {
  eventId: string;
  type: EventType;
  topic: string;
  aggregateId: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
}
