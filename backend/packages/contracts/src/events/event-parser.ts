import type { z } from 'zod';

import { InvalidEventError } from '../errors/invalid-event.error.js';
import type { AnyEventEnvelope } from '../interfaces/event-envelope.interface.js';
import { eventEnvelopeSchema } from '../schemas/event-envelope.schema.js';
import { eventPayloadSchemas } from '../schemas/event-payload.schema.js';

/** Turns raw Kafka message values into typed, validated envelopes. */
export class EventParser {
  public static parseJson(value: Buffer | string): AnyEventEnvelope {
    let raw: unknown;
    try {
      raw = JSON.parse(value.toString());
    } catch {
      throw new InvalidEventError('Event value is not valid JSON');
    }
    return EventParser.parse(raw);
  }

  public static parse(raw: unknown): AnyEventEnvelope {
    const envelope = eventEnvelopeSchema.safeParse(raw);
    if (!envelope.success) {
      throw new InvalidEventError('Invalid event envelope', EventParser.toIssues(envelope.error));
    }
    const payload = eventPayloadSchemas[envelope.data.type].safeParse(envelope.data.payload);
    if (!payload.success) {
      throw new InvalidEventError(
        `Invalid payload for ${envelope.data.type}`,
        EventParser.toIssues(payload.error),
      );
    }
    return { ...envelope.data, payload: payload.data } as AnyEventEnvelope;
  }

  private static toIssues(error: z.ZodError): string[] {
    return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
}
