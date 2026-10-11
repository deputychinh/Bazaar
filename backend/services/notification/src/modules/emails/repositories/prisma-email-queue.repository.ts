import { Injectable } from '@nestjs/common';

import { EmailStatus } from '../../../enums/email-status.enum.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { EmailMessage, QueuedEmail } from '../../../interfaces/email.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

import { EmailQueueRepository } from './email-queue.repository.js';

@Injectable()
export class PrismaEmailQueueRepository extends EmailQueueRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async enqueue(message: EmailMessage, transaction: Transaction): Promise<void> {
    await transaction.outgoingEmail.create({ data: { ...message, status: EmailStatus.Pending } });
  }

  public async pending(limit: number): Promise<QueuedEmail[]> {
    const rows = await this.prisma.outgoingEmail.findMany({
      where: { status: EmailStatus.Pending },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      to: row.to,
      subject: row.subject,
      text: row.text,
      html: row.html,
      attempts: row.attempts,
    }));
  }

  public async markSent(id: string, at: Date): Promise<void> {
    await this.prisma.outgoingEmail.update({
      where: { id },
      data: { status: EmailStatus.Sent, sentAt: at, attempts: { increment: 1 } },
    });
  }

  public async markAttemptFailed(id: string, error: string, isFinal: boolean): Promise<void> {
    await this.prisma.outgoingEmail.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: error.slice(0, 500),
        ...(isFinal && { status: EmailStatus.Failed }),
      },
    });
  }
}
