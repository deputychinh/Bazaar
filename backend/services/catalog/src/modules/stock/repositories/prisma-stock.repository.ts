import { EnumUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { ReservationStatus } from '../../../enums/reservation-status.enum.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { StockLine, StockReservation } from '../../../interfaces/stock.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

import { StockRepository } from './stock.repository.js';

const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * Stock lives in the product's variant array. The decrement is one conditional update
 * (`$elemMatch` with `stock ≥ qty`, then `$inc` on the matched element — ADR 0011): it either
 * takes the units or matches nothing, so two buyers can never both get the last item.
 */
@Injectable()
export class PrismaStockRepository extends StockRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async tryTake(line: StockLine, transaction: Transaction): Promise<boolean> {
    // Not an ObjectId: no such product. Answer "unavailable" instead of failing the message.
    if (!OBJECT_ID.test(line.productId)) return false;
    const result = await transaction.$runCommandRaw({
      update: 'products',
      updates: [
        {
          q: {
            _id: { $oid: line.productId },
            variants: { $elemMatch: { sku: line.variantSku, stock: { $gte: line.quantity } } },
          },
          u: { $inc: { 'variants.$.stock': -line.quantity, totalStock: -line.quantity } },
        },
      ],
    });
    return (result as { n?: number }).n === 1;
  }

  public async giveBack(line: StockLine, transaction: Transaction): Promise<void> {
    if (!OBJECT_ID.test(line.productId)) return;
    await transaction.$runCommandRaw({
      update: 'products',
      updates: [
        {
          q: { _id: { $oid: line.productId }, 'variants.sku': line.variantSku },
          u: { $inc: { 'variants.$.stock': line.quantity, totalStock: line.quantity } },
        },
      ],
    });
  }

  public async available(line: StockLine, transaction: Transaction): Promise<number> {
    if (!OBJECT_ID.test(line.productId)) return 0;
    const product = await transaction.product.findUnique({
      where: { id: line.productId },
      select: { variants: true },
    });
    return product?.variants.find((variant) => variant.sku === line.variantSku)?.stock ?? 0;
  }

  public async findReservation(
    orderId: string,
    transaction: Transaction,
  ): Promise<StockReservation | null> {
    const row = await transaction.stockReservation.findUnique({ where: { id: orderId } });
    return row === null
      ? null
      : {
          orderId: row.id,
          status: EnumUtil.parse(ReservationStatus, row.status),
          lines: row.lines.map((line) => ({ ...line })),
          releasedSellerOrderIds: row.releasedSellerOrderIds,
        };
  }

  public async saveReservation(
    reservation: StockReservation,
    transaction: Transaction,
  ): Promise<void> {
    const data = {
      status: reservation.status,
      lines: reservation.lines,
      releasedSellerOrderIds: reservation.releasedSellerOrderIds,
    };
    await transaction.stockReservation.upsert({
      where: { id: reservation.orderId },
      create: { id: reservation.orderId, ...data },
      update: data,
    });
  }

  public async slugsOf(productIds: string[]): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { id: { in: productIds.filter((id) => OBJECT_ID.test(id)) } },
      select: { slug: true },
    });
    return rows.map((row) => row.slug);
  }
}
