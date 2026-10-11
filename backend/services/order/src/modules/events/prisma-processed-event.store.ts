import { ProcessedEventStore } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { Prisma } from '#prisma';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { Transaction } from '../../interfaces/transaction.interface.js';

const UNIQUE_VIOLATION = 'P2002';

/** Marks an event processed and runs the handler's writes in one MySQL transaction. */
@Injectable()
export class PrismaProcessedEventStore extends ProcessedEventStore<Transaction> {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async runOnce(
    eventId: string,
    work: (transaction: Transaction) => Promise<void>,
  ): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.processedEvent.create({ data: { eventId } });
        await work(transaction);
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        return false;
      }
      throw error;
    }
  }
}
