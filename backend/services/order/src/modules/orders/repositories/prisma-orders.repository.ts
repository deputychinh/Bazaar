import { OrderStatus, PaymentStatus, SellerOrderStatus } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import { Prisma } from '#prisma';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  OrderTransition,
  SellerOrderTransition,
} from '../../../interfaces/order-transition.interface.js';
import type { NewOrder, Order, SellerOrder } from '../../../interfaces/order.interface.js';
import type { PageRequest } from '../../../interfaces/page-request.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { OrderStateMachine } from '../domain/order-state-machine.js';
import { DuplicateIdempotencyKeyError } from '../errors/duplicate-idempotency-key.error.js';
import { OrderMapper } from '../mappers/order.mapper.js';

import { OrdersRepository } from './orders.repository.js';

const UNIQUE_VIOLATION = 'P2002';
const WITH_DETAILS = {
  sellerOrders: { include: { items: true }, orderBy: { createdAt: 'asc' } },
  payment: true,
} satisfies Prisma.OrderInclude;

@Injectable()
export class PrismaOrdersRepository extends OrdersRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async create(order: NewOrder, transaction: Transaction): Promise<Order> {
    try {
      const row = await transaction.order.create({
        data: {
          shopperId: order.shopperId,
          idempotencyKey: order.idempotencyKey,
          status: OrderStatus.Pending,
          totalUsdCents: order.totalUsdCents,
          sellerOrders: {
            create: order.sellerOrders.map((sellerOrder) => ({
              sellerId: sellerOrder.sellerId,
              shopId: sellerOrder.shopId,
              shopName: sellerOrder.shopName,
              status: SellerOrderStatus.Pending,
              subtotalUsdCents: sellerOrder.subtotalUsdCents,
              items: {
                create: sellerOrder.items.map((item) => ({
                  productId: item.productId,
                  productSlug: item.productSlug,
                  variantSku: item.variantSku,
                  titleSnapshot: item.title as unknown as Prisma.InputJsonObject,
                  variantLabel: item.variantLabel as unknown as Prisma.InputJsonObject,
                  imageUrl: item.imageUrl,
                  quantity: item.quantity,
                  unitPriceUsdCents: item.unitPriceUsdCents,
                })),
              },
            })),
          },
          payment: {
            create: {
              status: PaymentStatus.Pending,
              providerToken: order.payment.providerToken,
              cardLast4: order.payment.cardLast4,
              amountUsdCents: order.totalUsdCents,
            },
          },
        },
        include: WITH_DETAILS,
      });
      return OrderMapper.toDomain(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new DuplicateIdempotencyKeyError('Idempotency-Key already used');
      }
      throw error;
    }
  }

  public async findById(id: string, transaction?: Transaction): Promise<Order | null> {
    const row = await (transaction ?? this.prisma).order.findUnique({
      where: { id },
      include: WITH_DETAILS,
    });
    return row === null ? null : OrderMapper.toDomain(row);
  }

  public async findByIdempotencyKey(shopperId: string, key: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({
      where: { shopperId_idempotencyKey: { shopperId, idempotencyKey: key } },
      include: WITH_DETAILS,
    });
    return row === null ? null : OrderMapper.toDomain(row);
  }

  public async transition(change: OrderTransition, transaction: Transaction): Promise<boolean> {
    const moved = await transaction.order.updateMany({
      where: { id: change.orderId, status: { in: OrderStateMachine.sourcesOf(change.to) } },
      data: {
        status: change.to,
        ...(change.cancelReason && { cancelReason: change.cancelReason }),
      },
    });
    if (moved.count === 0) return false;
    if (change.sellerOrders !== undefined) {
      const { to, cancelReason, at } = change.sellerOrders;
      await transaction.sellerOrder.updateMany({
        where: { orderId: change.orderId, status: { in: OrderStateMachine.sellerSourcesOf(to) } },
        data: {
          status: to,
          ...(cancelReason && { cancelReason }),
          ...PrismaOrdersRepository.stamp(to, at),
        },
      });
    }
    if (change.payment !== undefined) {
      await transaction.payment.update({
        where: { orderId: change.orderId },
        data: change.payment,
      });
    }
    return true;
  }

  public async transitionSellerOrder(
    change: SellerOrderTransition,
    transaction: Transaction,
  ): Promise<boolean> {
    const moved = await transaction.sellerOrder.updateMany({
      where: {
        id: change.sellerOrderId,
        status: { in: OrderStateMachine.sellerSourcesOf(change.to) },
      },
      data: {
        status: change.to,
        ...(change.cancelReason && { cancelReason: change.cancelReason }),
        ...PrismaOrdersRepository.stamp(change.to, change.at),
      },
    });
    return moved.count === 1;
  }

  public async updatePayment(
    orderId: string,
    payment: NonNullable<OrderTransition['payment']>,
    transaction: Transaction,
  ): Promise<void> {
    await transaction.payment.update({ where: { orderId }, data: payment });
  }

  public async findByShopper(
    shopperId: string,
    page: PageRequest,
  ): Promise<{ items: Order[]; total: number }> {
    const where = { shopperId };
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        include: WITH_DETAILS,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: rows.map((row) => OrderMapper.toDomain(row)), total };
  }

  public async findBySellerOrderId(sellerOrderId: string): Promise<Order | null> {
    const row = await this.prisma.order.findFirst({
      where: { sellerOrders: { some: { id: sellerOrderId } } },
      include: WITH_DETAILS,
    });
    return row === null ? null : OrderMapper.toDomain(row);
  }

  public async findSellerOrders(
    sellerId: string,
    filter: { status?: SellerOrderStatus } & PageRequest,
  ): Promise<{ items: SellerOrder[]; total: number }> {
    // Seller orders appear once the order is confirmed (PENDING ones are not the seller's yet).
    const where: Prisma.SellerOrderWhereInput = {
      sellerId,
      status: filter.status ?? { not: SellerOrderStatus.Pending },
    };
    const [rows, total] = await Promise.all([
      this.prisma.sellerOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        include: { items: true, order: { include: WITH_DETAILS } },
      }),
      this.prisma.sellerOrder.count({ where }),
    ]);
    const items = rows.map((row) => {
      const order = OrderMapper.toDomain(row.order);
      return order.sellerOrders.find((sellerOrder) => sellerOrder.id === row.id) as SellerOrder;
    });
    return { items, total };
  }

  public async findStale(statuses: OrderStatus[], before: Date, limit: number): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { status: { in: statuses }, createdAt: { lt: before } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: WITH_DETAILS,
    });
    return rows.map((row) => OrderMapper.toDomain(row));
  }

  /** The timestamp column that records reaching a seller order status. */
  private static stamp(
    to: SellerOrderStatus,
    at: Date | undefined,
  ): Partial<Record<'shippedAt' | 'deliveredAt' | 'cancelledAt', Date>> {
    const when = at ?? new Date();
    if (to === SellerOrderStatus.Shipped) return { shippedAt: when };
    if (to === SellerOrderStatus.Delivered) return { deliveredAt: when };
    if (to === SellerOrderStatus.Cancelled) return { cancelledAt: when };
    return {};
  }
}
