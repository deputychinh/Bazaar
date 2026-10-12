import { DEFAULT_PAGE_SIZE, eventTypeSchema, MAX_PAGE_SIZE } from '@bazaar/contracts';
import { z } from 'zod';

export const searchEventsQuerySchema = z.object({
  type: eventTypeSchema.optional(),
  aggregateId: z.string().min(1).max(64).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const eventLogEntrySchema = z
  .object({
    eventId: z.string(),
    type: eventTypeSchema,
    topic: z.string(),
    aggregateId: z.string(),
    occurredAt: z.iso.datetime(),
    payload: z.record(z.string(), z.unknown()),
  })
  .meta({ id: 'EventLogEntry' });

export const eventLogPageSchema = z
  .object({
    items: z.array(eventLogEntrySchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .meta({ id: 'EventLogPage' });

export type SearchEventsQuery = z.infer<typeof searchEventsQuerySchema>;
export type EventLogPageResponse = z.infer<typeof eventLogPageSchema>;
