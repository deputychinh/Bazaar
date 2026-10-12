import { EventFactory, EventType, ProductStatus } from '@bazaar/contracts';
import { CacheStore, ForbiddenError, NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import type { Product } from '../../../interfaces/product.interface.js';
import type { Review } from '../../../interfaces/review.interface.js';
import { CacheKeyUtil } from '../../../utils/cache-key.util.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { ProductsRepository } from '../../products/repositories/products.repository.js';
import type {
  CreateReviewRequest,
  ListReviewsQuery,
  ReviewEligibilityResponse,
  ReviewPageResponse,
} from '../dto/review.dto.js';
import { ReviewsRepository } from '../repositories/reviews.repository.js';

/** Reviews after delivery (plan F11, FR-10): one per product and shopper; rating kept up to date. */
@Injectable()
export class ReviewsService {
  public constructor(
    private readonly reviews: ReviewsRepository,
    private readonly products: ProductsRepository,
    private readonly transactions: TransactionManager,
    private readonly outbox: EventOutbox,
    private readonly cache: CacheStore,
  ) {}

  public async list(slug: string, query: ListReviewsQuery): Promise<ReviewPageResponse> {
    const product = await this.published(slug);
    const page = await this.reviews.page(product.id, query);
    return {
      ...query,
      total: page.total,
      items: page.items.map((review) => ReviewsService.toResponse(review)),
    };
  }

  public async eligibility(shopperId: string, slug: string): Promise<ReviewEligibilityResponse> {
    const product = await this.published(slug);
    const [received, hasReviewed] = await Promise.all([
      this.reviews.isEligible(shopperId, product.id),
      this.reviews.hasReviewed(shopperId, product.id),
    ]);
    return { canReview: received && !hasReviewed, hasReviewed };
  }

  /** Stores the review, recomputes the product's rating and announces RatingUpdated, at once. */
  public async submit(
    shopperId: string,
    slug: string,
    input: CreateReviewRequest,
  ): Promise<Review> {
    const product = await this.published(slug);
    if (!(await this.reviews.isEligible(shopperId, product.id))) {
      throw new ForbiddenError('Only shoppers who received this product can review it');
    }
    const review = await this.transactions.run(async (transaction) => {
      const created = await this.reviews.create(
        { ...input, productId: product.id, shopperId },
        transaction,
      );
      const rating = await this.reviews.summary(product.id, transaction);
      await this.reviews.saveRating(product.id, rating, transaction);
      await this.outbox.add(
        EventFactory.create({
          type: EventType.RatingUpdated,
          aggregateId: product.id,
          payload: { productId: product.id, slug: product.slug, ...rating },
        }),
        transaction,
      );
      return created;
    });
    await this.cache.delete(CacheKeyUtil.productDetail(product.slug));
    return review;
  }

  public static toResponse(review: Review): ReviewPageResponse['items'][number] {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      locale: review.locale,
      createdAt: review.createdAt.toISOString(),
    };
  }

  private async published(slug: string): Promise<Product> {
    const product = await this.products.findBySlug(slug);
    if (product?.status !== ProductStatus.Published) throw new NotFoundError('Product', slug);
    return product;
  }
}
