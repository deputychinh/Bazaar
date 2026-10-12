import { localeSchema } from '@bazaar/contracts';
import { z } from 'zod';

import { MAX_REVIEW_COMMENT_LENGTH, REVIEW_PAGE_SIZE } from '../../../constants/review.constant.js';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(MAX_REVIEW_COMMENT_LENGTH),
  locale: localeSchema,
});

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(REVIEW_PAGE_SIZE),
});

/** Reviews are shown as "verified buyer": no names or ids of shoppers are exposed. */
export const reviewSchema = z
  .object({
    id: z.string(),
    rating: z.number().int(),
    comment: z.string(),
    locale: localeSchema,
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Review' });

export const reviewPageSchema = z
  .object({
    items: z.array(reviewSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .meta({ id: 'ReviewPage' });

export const reviewEligibilitySchema = z
  .object({ canReview: z.boolean(), hasReviewed: z.boolean() })
  .meta({ id: 'ReviewEligibility' });

export type CreateReviewRequest = z.infer<typeof createReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type ReviewResponse = z.infer<typeof reviewSchema>;
export type ReviewPageResponse = z.infer<typeof reviewPageSchema>;
export type ReviewEligibilityResponse = z.infer<typeof reviewEligibilitySchema>;
