import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { Transaction } from '../../interfaces/transaction.interface.js';

import { TransactionManager } from './transaction-manager.js';

@Injectable()
export class PrismaTransactionManager extends TransactionManager {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public run<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }
}
