import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, sellerApplicationStatusSchema } from '@bazaar/contracts';
import { z } from 'zod';

export const applySchema = z.object({ shopName: z.string().trim().min(3).max(80) });
export type ApplyDto = z.infer<typeof applySchema>;

export const rejectSchema = z.object({ reason: z.string().trim().min(3).max(500) });
export type RejectDto = z.infer<typeof rejectSchema>;

export const listApplicationsQuerySchema = z.object({
  status: sellerApplicationStatusSchema.optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;

export const sellerApplicationResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  shopName: z.string(),
  status: sellerApplicationStatusSchema,
  rejectionReason: z.string().nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type SellerApplicationResponse = z.infer<typeof sellerApplicationResponseSchema>;

export const sellerApplicationPageSchema = z.object({
  items: z.array(sellerApplicationResponseSchema),
  nextCursor: z.string().nullable(),
});
export type SellerApplicationPage = z.infer<typeof sellerApplicationPageSchema>;
