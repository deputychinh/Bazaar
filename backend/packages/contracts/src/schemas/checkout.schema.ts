import { z } from 'zod';

import { MAX_ITEMS_PER_ORDER } from '../constants/order.constant.js';

import {
  cancelReasonSchema,
  orderStatusSchema,
  paymentStatusSchema,
  sellerOrderStatusSchema,
} from './enum.schema.js';
import { quoteLineRequestSchema, quoteResponseSchema } from './quote.schema.js';

const id = z.string().min(1);
const cents = z.number().int().nonnegative();
const localizedText = z.object({ en: z.string(), vi: z.string().optional() });

/** Test card details for the fake payment provider; only the provider sees the number. */
export const cardSchema = z.object({
  number: z.string().regex(/^\d{12,19}$/, 'Card number must be 12–19 digits'),
});

/** Client-chosen retry key, e.g. a UUID generated when the checkout page opens. */
export const idempotencyKeySchema = z
  .string()
  .regex(/^[\w-]{8,64}$/, 'Use 8–64 letters, digits, _ or -');

/** Shopper → gateway `POST /api/v1/orders` (with an Idempotency-Key header). */
export const checkoutRequestSchema = z
  .object({
    lines: z.array(quoteLineRequestSchema).min(1).max(MAX_ITEMS_PER_ORDER),
    card: cardSchema,
  })
  .meta({ id: 'CheckoutRequest' });

/** A line priced by the catalog quote, as the gateway hands it to the order service. */
export const pricedOrderLineSchema = z.object({
  productId: id,
  productSlug: id,
  variantSku: id,
  quantity: z.number().int().positive(),
  sellerId: id,
  shopId: id,
  shopName: id,
  title: localizedText,
  variantLabel: localizedText,
  imageUrl: z.string().nullable(),
  unitPriceUsdCents: cents,
});

/** Gateway → order `POST /api/v1/internal/orders`; the shopper comes from the forwarded JWT. */
export const createOrderRequestSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  lines: z.array(pricedOrderLineSchema).min(1).max(MAX_ITEMS_PER_ORDER),
  card: cardSchema,
});

const orderItemViewSchema = z.object({
  id,
  productId: id,
  productSlug: id,
  variantSku: id,
  title: localizedText,
  variantLabel: localizedText,
  imageUrl: z.string().nullable(),
  quantity: z.number().int().positive(),
  unitPriceUsdCents: cents,
});

const timestamp = z.iso.datetime();

export const sellerOrderViewSchema = z
  .object({
    id,
    orderId: id,
    sellerId: id,
    shop: z.object({ id, name: id }),
    status: sellerOrderStatusSchema,
    subtotalUsdCents: cents,
    cancelReason: cancelReasonSchema.nullable(),
    shippedAt: timestamp.nullable(),
    deliveredAt: timestamp.nullable(),
    cancelledAt: timestamp.nullable(),
    createdAt: timestamp,
    items: z.array(orderItemViewSchema),
  })
  .meta({ id: 'SellerOrder' });

/** An order as the shopper sees it, everywhere (checkout answer, order pages, live updates). */
export const orderViewSchema = z
  .object({
    id,
    status: orderStatusSchema,
    totalUsdCents: cents,
    cancelReason: cancelReasonSchema.nullable(),
    payment: z.object({ status: paymentStatusSchema, cardLast4: z.string().length(4) }).nullable(),
    sellerOrders: z.array(sellerOrderViewSchema),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  .meta({ id: 'Order' });

/** Details of a CART_CHANGED problem: the lines the shopper must fix. */
export const cartChangedDetailsSchema = z.object({
  lines: quoteResponseSchema.shape.lines,
});

export type Card = z.infer<typeof cardSchema>;
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
export type PricedOrderLine = z.infer<typeof pricedOrderLineSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
export type OrderView = z.infer<typeof orderViewSchema>;
export type SellerOrderView = z.infer<typeof sellerOrderViewSchema>;
