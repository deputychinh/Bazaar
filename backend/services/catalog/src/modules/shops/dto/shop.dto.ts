import { shopStatusSchema } from '@bazaar/contracts';
import { z } from 'zod';

export const localizedTextSchema = z.object({
  en: z.string().trim().min(1).max(2000),
  vi: z.string().trim().max(2000).optional(),
});

export const updateShopSchema = z
  .object({
    name: z.string().trim().min(3).max(80).optional(),
    description: localizedTextSchema.optional(),
  })
  .refine((body) => body.name !== undefined || body.description !== undefined, {
    message: 'Send at least one field to change',
  });
export type UpdateShopDto = z.infer<typeof updateShopSchema>;

export const shopResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.object({ en: z.string(), vi: z.string().optional() }).nullable(),
  status: shopStatusSchema,
  createdAt: z.iso.datetime(),
});
export type ShopResponse = z.infer<typeof shopResponseSchema>;
