import { Locale } from '@bazaar/contracts';
import { EnumUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { type Review as ReviewRow, Prisma } from '#prisma';

import { RATING_DECIMALS } from '../../../constants/review.constant.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  NewReview,
  RatingSummary,
  Review,
  ReviewPage,
} from '../../../interfaces/review.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { DuplicateReviewError } from '../errors/duplicate-review.error.js';

import { ReviewsRepository } from './reviews.repository.js';

const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class PrismaReviewsRepository extends ReviewsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async markEligible(
    shopperId: string,
    productIds: string[],
    transaction: Transaction,
  ): Promise<void> {
    const deliveredAt = new Date();
    for (const productId of productIds) {
      await transaction.reviewEligibility.upsert({
        where: { id: PrismaReviewsRepository.eligibilityId(shopperId, productId) },
        create: {
          id: PrismaReviewsRepository.eligibilityId(shopperId, productId),
          shopperId,
          productId,
          deliveredAt,
        },
        update: {},
      });
    }
  }

  public async isEligible(shopperId: string, productId: string): Promise<boolean> {
    const row = await this.prisma.reviewEligibility.findUnique({
      where: { id: PrismaReviewsRepository.eligibilityId(shopperId, productId) },
    });
    return row !== null;
  }

  public async hasReviewed(shopperId: string, productId: string): Promise<boolean> {
    return (await this.prisma.review.count({ where: { productId, shopperId } })) > 0;
  }

  public async create(review: NewReview, transaction: Transaction): Promise<Review> {
    try {
      return PrismaReviewsRepository.toDomain(await transaction.review.create({ data: review }));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new DuplicateReviewError('You already reviewed this product');
      }
      throw error;
    }
  }

  public async page(
    productId: string,
    page: { page: number; pageSize: number },
  ): Promise<ReviewPage> {
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);
    return { items: rows.map((row) => PrismaReviewsRepository.toDomain(row)), total };
  }

  public async summary(productId: string, transaction: Transaction): Promise<RatingSummary> {
    const result = await transaction.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const average = result._avg.rating ?? 0;
    return { average: Number(average.toFixed(RATING_DECIMALS)), count: result._count._all };
  }

  public async saveRating(
    productId: string,
    rating: RatingSummary,
    transaction: Transaction,
  ): Promise<void> {
    await transaction.product.update({ where: { id: productId }, data: { rating } });
  }

  /** One eligibility per shopper and product: "<shopperId>:<productId>". */
  private static eligibilityId(shopperId: string, productId: string): string {
    return `${shopperId}:${productId}`;
  }

  private static toDomain(row: ReviewRow): Review {
    return {
      id: row.id,
      productId: row.productId,
      shopperId: row.shopperId,
      rating: row.rating,
      comment: row.comment,
      locale: EnumUtil.parse(Locale, row.locale),
      createdAt: row.createdAt,
    };
  }
}
