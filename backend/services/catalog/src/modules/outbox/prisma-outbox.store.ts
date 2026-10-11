import { type OutboxMessage, OutboxStore } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

/** Reads unsent outbox documents in insertion order (ObjectIds grow with time). */
@Injectable()
export class PrismaOutboxStore extends OutboxStore {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async fetchUnsent(limit: number): Promise<OutboxMessage[]> {
    const rows = await this.prisma.outboxMessage.findMany({
      where: { sentAt: null },
      orderBy: { id: 'asc' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      key: row.msgKey,
      value: row.value,
      headers: row.headers as Record<string, string>,
    }));
  }

  public async markSent(ids: string[]): Promise<void> {
    await this.prisma.outboxMessage.updateMany({
      where: { id: { in: ids } },
      data: { sentAt: new Date() },
    });
  }
}
