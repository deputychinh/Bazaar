import { z } from 'zod';

import { MAX_ITEMS_PER_ORDER, MAX_QUANTITY_PER_ITEM } from '../constants/order.constant.js';
import { QuoteProblem } from '../enums/quote-problem.enum.js';

const text = z.string().min(1);
const localizedText = z.object({ en: z.string(), vi: z.string().optional() });

export const quoteLineRequestSchema = z.object({
  productSlug: text.max(160),
  variantSku: text.max(64),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
});

/** Gateway → catalog: price these cart lines with the catalog's current data. */
export const quoteRequestSchema = z.object({
  lines: z.array(quoteLineRequestSchema).min(1).max(MAX_ITEMS_PER_ORDER),
});

const pricedLineSchema = quoteLineRequestSchema.extend({
  available: z.literal(true),
  productId: text,
  sellerId: text,
  shopId: text,
  shopName: text,
  title: localizedText,
  variantLabel: text,
  imageUrl: z.string().nullable(),
  unitPriceUsdCents: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
});

const unavailableLineSchema = quoteLineRequestSchema.extend({
  available: z.literal(false),
  problem: z.enum(QuoteProblem),
  /** Units left when the problem is INSUFFICIENT_STOCK. */
  stock: z.number().int().nonnegative().nullable(),
});

export const quoteLineSchema = z.discriminatedUnion('available', [
  pricedLineSchema,
  unavailableLineSchema,
]);

/** Catalog → gateway: one answer per requested line, in the same order. */
export const quoteResponseSchema = z.object({ lines: z.array(quoteLineSchema) });

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type QuoteLineRequest = z.infer<typeof quoteLineRequestSchema>;
export type QuoteLine = z.infer<typeof quoteLineSchema>;
export type PricedQuoteLine = z.infer<typeof pricedLineSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
