import { MAX_PAGE_SIZE, productStatusSchema } from '@bazaar/contracts';
import { z } from 'zod';

import {
  DEFAULT_PRODUCT_PAGE_SIZE,
  MAX_PRODUCT_PAGE,
} from '../../../constants/catalog.constant.js';
import { ProductSort } from '../../../enums/product-sort.enum.js';

const localized = z.object({ en: z.string(), vi: z.string().optional() });
const cents = z.coerce.number().int().min(0);

export const listProductsQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    category: z.string().min(1).optional(),
    shop: z.string().min(1).optional(),
    minPrice: cents.optional(),
    maxPrice: cents.optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z.enum(ProductSort).meta({ id: 'ProductSort' }).optional(),
    page: z.coerce.number().int().min(1).max(MAX_PRODUCT_PAGE).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PRODUCT_PAGE_SIZE),
  })
  .refine((query) => query.sort !== ProductSort.Relevance || query.q !== undefined, {
    message: 'Sorting by relevance needs a search text (q)',
    path: ['sort'],
  });
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const productSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: localized,
  minPriceUsdCents: z.number().int(),
  imageUrl: z.string().nullable(),
  rating: z.object({ average: z.number(), count: z.number().int() }),
  inStock: z.boolean(),
});
export type ProductSummary = z.infer<typeof productSummarySchema>;

export const productPageSchema = z.object({
  items: z.array(productSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type ProductPageResponse = z.infer<typeof productPageSchema>;

export const productDetailSchema = productSummarySchema.extend({
  description: localized,
  categoryId: z.string(),
  status: productStatusSchema,
  attributes: z.record(z.string(), z.unknown()).nullable(),
  variants: z.array(
    z.object({
      sku: z.string(),
      priceUsdCents: z.number().int(),
      stock: z.number().int(),
      attributes: z.record(z.string(), z.unknown()).nullable(),
    }),
  ),
  images: z.array(z.object({ url: z.string(), alt: localized.nullable() })),
  shop: z.object({ slug: z.string(), name: z.string() }),
  publishedAt: z.iso.datetime().nullable(),
});
export type ProductDetail = z.infer<typeof productDetailSchema>;
