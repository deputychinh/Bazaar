import { OrderStatus, SellerOrderStatus } from '@bazaar/contracts';
import { EnumUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { Prisma } from '#prisma';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  DailyFigure,
  DailyRow,
  PlatformFigures,
  SellerFigures,
  TopSellerRow,
} from '../../../interfaces/stats.interface.js';

import { StatsRepository } from './stats.repository.js';

/** Orders that count as sales: paid and not cancelled as a whole. */
const SOLD_ORDER_STATUSES = [OrderStatus.Paid, OrderStatus.Confirmed, OrderStatus.Completed];
const SOLD_PART_STATUSES = [
  SellerOrderStatus.Confirmed,
  SellerOrderStatus.Shipped,
  SellerOrderStatus.Delivered,
];

@Injectable()
export class PrismaStatsRepository extends StatsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async sellerFigures(sellerId: string, since: Date): Promise<SellerFigures> {
    const [rows, toShip] = await Promise.all([
      this.prisma.$queryRaw<DailyRow[]>`
        SELECT DATE(created_at) AS day, COUNT(*) AS orders, SUM(subtotal_usd_cents) AS cents
        FROM seller_orders
        WHERE seller_id = ${sellerId} AND created_at >= ${since}
          AND status IN (${Prisma.join(SOLD_PART_STATUSES)})
        GROUP BY DATE(created_at)`,
      this.prisma.sellerOrder.count({ where: { sellerId, status: SellerOrderStatus.Confirmed } }),
    ]);
    return { daily: rows.map((row) => PrismaStatsRepository.toDaily(row)), toShip };
  }

  public async platformFigures(since: Date, topCount: number): Promise<PlatformFigures> {
    const [rows, statuses, sellers] = await Promise.all([
      this.prisma.$queryRaw<DailyRow[]>`
        SELECT DATE(created_at) AS day, COUNT(*) AS orders, SUM(total_usd_cents) AS cents
        FROM orders
        WHERE created_at >= ${since} AND status IN (${Prisma.join(SOLD_ORDER_STATUSES)})
        GROUP BY DATE(created_at)`,
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<TopSellerRow[]>`
        SELECT seller_id, MAX(shop_name) AS shop_name, COUNT(*) AS orders, SUM(subtotal_usd_cents) AS cents
        FROM seller_orders
        WHERE created_at >= ${since} AND status IN (${Prisma.join(SOLD_PART_STATUSES)})
        GROUP BY seller_id
        ORDER BY cents DESC
        LIMIT ${topCount}`,
    ]);
    return {
      daily: rows.map((row) => PrismaStatsRepository.toDaily(row)),
      byStatus: Object.fromEntries(
        statuses.map((row) => [EnumUtil.parse(OrderStatus, row.status), row._count._all]),
      ),
      topSellers: sellers.map((row) => ({
        sellerId: row.seller_id,
        shopName: row.shop_name,
        orders: Number(row.orders),
        usdCents: Number(row.cents ?? 0),
      })),
    };
  }

  public async ordersByStatus(): Promise<Partial<Record<OrderStatus, number>>> {
    const rows = await this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
    return Object.fromEntries(
      rows.map((row) => [EnumUtil.parse(OrderStatus, row.status), row._count._all]),
    );
  }

  private static toDaily(row: DailyRow): DailyFigure {
    const day =
      row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10);
    return { date: day, orders: Number(row.orders), usdCents: Number(row.cents ?? 0) };
  }
}
