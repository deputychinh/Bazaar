import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  orderViewSchema,
  sellerOrderStatusSchema,
  sellerOrderViewSchema,
} from '@bazaar/contracts';
import { z } from 'zod';

const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

export const listOrdersQuerySchema = z.object(pageFields);
export const listSellerOrdersQuerySchema = z.object({
  ...pageFields,
  status: sellerOrderStatusSchema.optional(),
});

const pageMeta = { total: z.number().int(), page: z.number().int(), pageSize: z.number().int() };

export const orderPageSchema = z
  .object({ items: z.array(orderViewSchema), ...pageMeta })
  .meta({ id: 'OrderPage' });
export const sellerOrderPageSchema = z
  .object({ items: z.array(sellerOrderViewSchema), ...pageMeta })
  .meta({ id: 'SellerOrderPage' });

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type ListSellerOrdersQuery = z.infer<typeof listSellerOrdersQuerySchema>;
export type OrderPage = z.infer<typeof orderPageSchema>;
export type SellerOrderPage = z.infer<typeof sellerOrderPageSchema>;
