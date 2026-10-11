import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, productStatusSchema } from '@bazaar/contracts';
import { z } from 'zod';

import {
  MAX_PRICE_USD_CENTS,
  MAX_STOCK_PER_VARIANT,
  MAX_VARIANTS_PER_PRODUCT,
} from '../../../constants/catalog.constant.js';

import { productDetailSchema } from './product.dto.js';

const titleSchema = z.object({
  en: z.string().trim().min(3).max(120),
  vi: z.string().trim().min(3).max(120).optional(),
});
const descriptionSchema = z.object({
  en: z.string().trim().min(10).max(5000),
  vi: z.string().trim().min(10).max(5000).optional(),
});
const variantSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,40}$/),
  priceUsdCents: z.number().int().min(1).max(MAX_PRICE_USD_CENTS),
  stock: z.number().int().min(0).max(MAX_STOCK_PER_VARIANT),
  attributes: z.record(z.string(), z.unknown()).nullable().default(null),
});

export const createProductSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  categoryId: z.string().regex(/^[0-9a-f]{24}$/),
  attributes: z.record(z.string(), z.unknown()).nullable().default(null),
  variants: z.array(variantSchema).min(1).max(MAX_VARIANTS_PER_PRODUCT),
});
export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    categoryId: z
      .string()
      .regex(/^[0-9a-f]{24}$/)
      .optional(),
    attributes: z.record(z.string(), z.unknown()).nullable().optional(),
    variants: z.array(variantSchema).min(1).max(MAX_VARIANTS_PER_PRODUCT).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Send at least one field to change',
  });
export type UpdateProductDto = z.infer<typeof updateProductSchema>;

export const sellerProductsQuerySchema = z.object({
  status: productStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type SellerProductsQuery = z.infer<typeof sellerProductsQuerySchema>;

export const sellerProductSchema = productDetailSchema.omit({ shop: true }).extend({
  hiddenReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type SellerProduct = z.infer<typeof sellerProductSchema>;

export const sellerProductPageSchema = z.object({
  items: z.array(sellerProductSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type SellerProductPage = z.infer<typeof sellerProductPageSchema>;
