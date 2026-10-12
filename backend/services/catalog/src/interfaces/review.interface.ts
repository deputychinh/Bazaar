import type { Locale } from '@bazaar/contracts';

export interface Review {
  id: string;
  productId: string;
  shopperId: string;
  rating: number;
  comment: string;
  locale: Locale;
  createdAt: Date;
}

export type NewReview = Omit<Review, 'id' | 'createdAt'>;

export interface RatingSummary {
  average: number;
  count: number;
}

export interface ReviewPage {
  items: Review[];
  total: number;
}
