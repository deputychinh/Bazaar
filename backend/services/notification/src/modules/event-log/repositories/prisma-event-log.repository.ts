import { Injectable } from '@nestjs/common';

import type { Prisma } from '#prisma';

import type { EventLogEntry } from '../../../interfaces/event-log-entry.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

import { EventLogRepository } from './event-log.repository.js';

@Injectable()
export class PrismaEventLogRepository extends EventLogRepository {
  public async append(entry: EventLogEntry, transaction: Transaction): Promise<void> {
    await transaction.eventLogEntry.create({
      data: {
        id: entry.eventId,
        type: entry.type,
        topic: entry.topic,
        aggregateId: entry.aggregateId,
        occurredAt: entry.occurredAt,
        payload: entry.payload as Prisma.InputJsonObject,
      },
    });
  }
}
