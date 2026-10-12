import { type EventEnvelope, EventType, Locale, ProductStatus } from '@bazaar/contracts';
import { ForbiddenError, InMemoryCacheStore, NotFoundError } from '@bazaar/nest-common';

import {
  ImmediateTransactionManager,
  InMemoryProductsRepository,
  InMemoryReviewsRepository,
  productFixture,
  RecordingOutbox,
} from '../../../../test/fakes/catalog.fakes.js';
import { DuplicateReviewError } from '../errors/duplicate-review.error.js';

import { ReviewsService } from './reviews.service.js';

describe('ReviewsService', () => {
  let reviews: InMemoryReviewsRepository;
  let outbox: RecordingOutbox;
  let cache: InMemoryCacheStore;
  let service: ReviewsService;
  const input = { rating: 4, comment: 'Lovely glaze', locale: Locale.En };

  beforeEach(async () => {
    reviews = new InMemoryReviewsRepository();
    outbox = new RecordingOutbox();
    cache = new InMemoryCacheStore();
    const products = new InMemoryProductsRepository([
      productFixture({ id: 'p1', slug: 'vase' }),
      productFixture({ id: 'p2', slug: 'draft', status: ProductStatus.Draft }),
    ]);
    service = new ReviewsService(
      reviews,
      products,
      new ImmediateTransactionManager(),
      outbox,
      cache,
    );
    await reviews.markEligible('linh', ['p1']);
  });

  it('lets a shopper who received the product review it once and updates the rating', async () => {
    const deleteSpy = vi.spyOn(cache, 'delete');
    expect(await service.eligibility('linh', 'vase')).toEqual({
      canReview: true,
      hasReviewed: false,
    });

    await service.submit('linh', 'vase', input);
    await reviews.markEligible('tom', ['p1']);
    await service.submit('tom', 'vase', { ...input, rating: 5 });

    expect(reviews.ratings.get('p1')).toEqual({ average: 4.5, count: 2 });
    const last = outbox.events.at(-1) as EventEnvelope<EventType.RatingUpdated>;
    expect(last).toMatchObject({
      type: EventType.RatingUpdated,
      payload: { productId: 'p1', slug: 'vase', average: 4.5, count: 2 },
    });
    expect(deleteSpy).toHaveBeenCalledWith('catalog:product:vase');
    expect(await service.eligibility('linh', 'vase')).toEqual({
      canReview: false,
      hasReviewed: true,
    });
    await expect(service.submit('linh', 'vase', input)).rejects.toBeInstanceOf(
      DuplicateReviewError,
    );
  });

  it('refuses shoppers who did not receive it, and unpublished products', async () => {
    await expect(service.submit('stranger', 'vase', input)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(service.submit('linh', 'draft', input)).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.list('missing', { page: 1, pageSize: 10 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('lists reviews newest first without shopper ids', async () => {
    await service.submit('linh', 'vase', input);
    const page = await service.list('vase', { page: 1, pageSize: 10 });
    expect(page).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      items: [
        {
          id: 'review-1',
          rating: 4,
          comment: 'Lovely glaze',
          locale: Locale.En,
          createdAt: expect.any(String),
        },
      ],
    });
    expect(JSON.stringify(page)).not.toContain('linh');
  });
});
