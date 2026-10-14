import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, productStatusSchema } from '@bazaar/contracts';
import { z } from 'zod';

export const hideProductSchema = z.object({ reason: z.string().trim().min(3).max(500) });
export type HideProductDto = z.infer<typeof hideProductSchema>;

export const moderationQuerySchema = z.object({
  status: productStatusSchema.optional(),
  q: z.string().trim().min(1).max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ModerationQuery = z.infer<typeof moderationQuerySchema>;
