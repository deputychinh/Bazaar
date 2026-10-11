import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { OrderSummary } from '../../../interfaces/order-summary.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

import { OrderSummariesRepository } from './order-summaries.repository.js';

@Injectable()
export class PrismaOrderSummariesRepository extends OrderSummariesRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async save(summary: OrderSummary, transaction: Transaction): Promise<void> {
    const data = {
      shopperId: summary.shopperId,
      totalUsdCents: summary.totalUsdCents,
      sellers: summary.sellers,
      createdAt: summary.createdAt,
    };
    await transaction.orderSummary.upsert({
      where: { id: summary.orderId },
      create: { id: summary.orderId, ...data },
      update: data,
    });
  }

  public async find(orderId: string, transaction?: Transaction): Promise<OrderSummary | null> {
    const row = await (transaction ?? this.prisma).orderSummary.findUnique({
      where: { id: orderId },
    });
    return row === null
      ? null
      : {
          orderId: row.id,
          shopperId: row.shopperId,
          totalUsdCents: row.totalUsdCents,
          sellers: row.sellers.map((part) => ({ ...part })),
          createdAt: row.createdAt,
        };
  }
}
