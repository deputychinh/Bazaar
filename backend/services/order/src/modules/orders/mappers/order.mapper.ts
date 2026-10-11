import {
  CancelReason,
  type LocalizedText,
  type OrderView,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
} from '@bazaar/contracts';
import { EnumUtil } from '@bazaar/nest-common';

import type { OrderRow } from '../../../interfaces/order-row.interface.js';
import type { Order } from '../../../interfaces/order.interface.js';

/** Database rows ⇄ domain ⇄ API view; enum columns are validated on the way in (DS-01). */
export class OrderMapper {
  public static toDomain(row: OrderRow): Order {
    return {
      id: row.id,
      shopperId: row.shopperId,
      status: EnumUtil.parse(OrderStatus, row.status),
      totalUsdCents: row.totalUsdCents,
      cancelReason: OrderMapper.reason(row.cancelReason),
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payment:
        row.payment === null
          ? null
          : {
              id: row.payment.id,
              status: EnumUtil.parse(PaymentStatus, row.payment.status),
              providerToken: row.payment.providerToken,
              providerRef: row.payment.providerRef,
              cardLast4: row.payment.cardLast4,
              amountUsdCents: row.payment.amountUsdCents,
              failureReason: row.payment.failureReason,
            },
      sellerOrders: row.sellerOrders.map((sellerOrder) => ({
        id: sellerOrder.id,
        orderId: sellerOrder.orderId,
        sellerId: sellerOrder.sellerId,
        shopId: sellerOrder.shopId,
        shopName: sellerOrder.shopName,
        status: EnumUtil.parse(SellerOrderStatus, sellerOrder.status),
        subtotalUsdCents: sellerOrder.subtotalUsdCents,
        cancelReason: OrderMapper.reason(sellerOrder.cancelReason),
        shippedAt: sellerOrder.shippedAt,
        deliveredAt: sellerOrder.deliveredAt,
        cancelledAt: sellerOrder.cancelledAt,
        items: sellerOrder.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productSlug: item.productSlug,
          variantSku: item.variantSku,
          title: item.titleSnapshot as unknown as LocalizedText,
          variantLabel: item.variantLabel as unknown as LocalizedText,
          imageUrl: item.imageUrl,
          quantity: item.quantity,
          unitPriceUsdCents: item.unitPriceUsdCents,
        })),
      })),
    };
  }

  /** What the shopper may see: no provider token or reference. */
  public static toView(order: Order): OrderView {
    return {
      id: order.id,
      status: order.status,
      totalUsdCents: order.totalUsdCents,
      cancelReason: order.cancelReason,
      payment:
        order.payment === null
          ? null
          : { status: order.payment.status, cardLast4: order.payment.cardLast4 },
      sellerOrders: order.sellerOrders.map((sellerOrder) => ({
        id: sellerOrder.id,
        orderId: sellerOrder.orderId,
        sellerId: sellerOrder.sellerId,
        shop: { id: sellerOrder.shopId, name: sellerOrder.shopName },
        status: sellerOrder.status,
        subtotalUsdCents: sellerOrder.subtotalUsdCents,
        cancelReason: sellerOrder.cancelReason,
        shippedAt: sellerOrder.shippedAt?.toISOString() ?? null,
        deliveredAt: sellerOrder.deliveredAt?.toISOString() ?? null,
        cancelledAt: sellerOrder.cancelledAt?.toISOString() ?? null,
        items: sellerOrder.items.map((item) => ({ ...item })),
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private static reason(value: string | null): CancelReason | null {
    return value === null ? null : EnumUtil.parse(CancelReason, value);
  }
}
