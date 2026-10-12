import type {
  NewReview,
  RatingSummary,
  Review,
  ReviewPage,
} from '../../../interfaces/review.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export abstract class ReviewsRepository {
  /** Remembers that the shopper received these products (idempotent). */
  public abstract markEligible(
    shopperId: string,
    productIds: string[],
    transaction: Transaction,
  ): Promise<void>;

  public abstract isEligible(shopperId: string, productId: string): Promise<boolean>;

  public abstract hasReviewed(shopperId: string, productId: string): Promise<boolean>;

  /** Throws DuplicateReviewError when the shopper already reviewed the product. */
  public abstract create(review: NewReview, transaction: Transaction): Promise<Review>;

  public abstract page(
    productId: string,
    page: { page: number; pageSize: number },
  ): Promise<ReviewPage>;

  public abstract summary(productId: string, transaction: Transaction): Promise<RatingSummary>;

  /** Writes the product's rating summary (shown on cards and pages). */
  public abstract saveRating(
    productId: string,
    rating: RatingSummary,
    transaction: Transaction,
  ): Promise<void>;
}
