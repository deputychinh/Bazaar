import { EventType } from '@bazaar/contracts';
import { EnumUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Prisma } from '#prisma';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { EventLogEntry } from '../../../interfaces/event-log-entry.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

import { EventLogRepository } from './event-log.repository.js';

@Injectable()
export class PrismaEventLogRepository extends EventLogRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

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

  public async search(filter: {
    type?: EventType;
    aggregateId?: string;
    page: number;
    pageSize: number;
  }): Promise<{ items: EventLogEntry[]; total: number }> {
    const where = {
      ...(filter.type && { type: filter.type }),
      ...(filter.aggregateId && { aggregateId: filter.aggregateId }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.eventLogEntry.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.eventLogEntry.count({ where }),
    ]);
    return {
      total,
      items: rows.map((row) => ({
        eventId: row.id,
        type: EnumUtil.parse(EventType, row.type),
        topic: row.topic,
        aggregateId: row.aggregateId,
        occurredAt: row.occurredAt,
        payload: row.payload as Record<string, unknown>,
      })),
    };
  }
}
