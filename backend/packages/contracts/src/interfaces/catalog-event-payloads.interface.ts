export interface ProductChangedPayload {
  productId: string;
  shopId: string;
  slug: string;
}

export interface RatingUpdatedPayload {
  productId: string;
  slug: string;
  average: number;
  count: number;
}
