import { z } from 'zod';

import { EventType } from '../enums/event-type.enum.js';

/** Shape check for the envelope; the payload is checked per type by `eventPayloadSchemas`. */
export const eventEnvelopeSchema = z.object({
  eventId: z.uuid(),
  type: z.enum(EventType),
  version: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
  aggregateId: z.string().min(1),
  traceId: z.string().min(1).nullable(),
  payload: z.unknown(),
});

export type EventEnvelopeShape = z.infer<typeof eventEnvelopeSchema>;
