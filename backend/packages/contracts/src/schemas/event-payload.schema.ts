import { z } from 'zod';

import { CancelReason } from '../enums/cancel-reason.enum';
import { EventType } from '../enums/event-type.enum';
import { Locale } from '../enums/locale.enum';
import type { EventPayloadMap } from '../interfaces/event-envelope.interface';

const id = z.string().min(1);
const cents = z.number().int().nonnegative();

const orderLine = z.object({
  sellerOrderId: id,
  sellerId: id,
  productId: id,
  variantSku: id,
  quantity: z.number().int().positive(),
  unitPriceUsdCents: cents,
});

const userContact = { userId: id, email: z.email(), preferredLocale: z.enum(Locale) };
const productChanged = z.object({ productId: id, shopId: id, slug: id });
const sellerOrderRef = { orderId: id, sellerOrderId: id, sellerId: id, shopperId: id };

/** Runtime schema of every event payload, keyed by event type. */
export const eventPayloadSchemas = {
  [EventType.UserRegistered]: z.object(userContact),
  [EventType.EmailVerificationRequested]: z.object({ ...userContact, link: z.url() }),
  [EventType.PasswordResetRequested]: z.object({ ...userContact, link: z.url() }),
  [EventType.SellerApproved]: z.object({ userId: id, applicationId: id, shopName: id }),
  [EventType.OrderCreated]: z.object({
    orderId: id,
    shopperId: id,
    totalUsdCents: cents,
    lines: z.array(orderLine).min(1),
  }),
  [EventType.OrderPaid]: z.object({ orderId: id, paymentId: id, amountUsdCents: cents }),
  [EventType.OrderConfirmed]: z.object({ orderId: id, shopperId: id }),
  [EventType.OrderCancelled]: z.object({
    orderId: id,
    shopperId: id,
    reason: z.enum(CancelReason),
    lines: z.array(orderLine),
  }),
  [EventType.OrderCompleted]: z.object({ orderId: id, shopperId: id }),
  [EventType.SellerOrderShipped]: z.object(sellerOrderRef),
  [EventType.SellerOrderDelivered]: z.object({ ...sellerOrderRef, productIds: z.array(id) }),
  [EventType.SellerOrderCancelled]: z.object({
    ...sellerOrderRef,
    reason: z.enum(CancelReason),
    lines: z.array(orderLine),
  }),
  [EventType.StockReserved]: z.object({ orderId: id }),
  [EventType.StockRejected]: z.object({
    orderId: id,
    unavailable: z.array(
      z.object({
        variantSku: id,
        requested: z.number().int().positive(),
        available: z.number().int().nonnegative(),
      }),
    ),
  }),
  [EventType.StockReleased]: z.object({ orderId: id, sellerOrderId: id.nullable() }),
  [EventType.ProductPublished]: productChanged,
  [EventType.ProductUpdated]: productChanged,
  [EventType.ProductHidden]: productChanged,
  [EventType.RatingUpdated]: z.object({
    productId: id,
    slug: id,
    average: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
  }),
} satisfies { [TType in EventType]: z.ZodType<EventPayloadMap[TType]> };
