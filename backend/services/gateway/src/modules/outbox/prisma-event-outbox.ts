import { type AnyEventEnvelope, EVENT_TOPIC, TRACE_ID_HEADER } from '@bazaar/contracts';
import { TraceContext } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Transaction } from '../../interfaces/transaction.interface.js';

import { EventOutbox } from './event-outbox.js';

@Injectable()
export class PrismaEventOutbox extends EventOutbox {
  public async add(event: AnyEventEnvelope, transaction: Transaction): Promise<void> {
    await transaction.outboxMessage.create({
      data: {
        topic: EVENT_TOPIC[event.type],
        msgKey: event.aggregateId,
        value: JSON.stringify(event),
        // The request's trace context travels with the row; the relay continues it.
        headers: {
          ...TraceContext.headers(),
          ...(event.traceId === null ? {} : { [TRACE_ID_HEADER]: event.traceId }),
        },
      },
    });
  }
}
