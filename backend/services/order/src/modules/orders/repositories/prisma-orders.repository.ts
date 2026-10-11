import { OrderStatus, PaymentStatus, SellerOrderStatus } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import { Prisma } from '#prisma';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { NewOrder, Order } from '../../../interfaces/order.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
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
}
