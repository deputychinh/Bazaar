import type { Server } from 'node:http';

import { EventFactory, EventType, UserRole } from '@bazaar/contracts';
import { CacheStore, InMemoryCacheStore } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createCatalogTestApp } from '../../../../test/fakes/catalog-test-app.js';
import {
  bearer,
  ImmediateTransactionManager,
  InMemoryProductsRepository,
  InMemoryReviewsRepository,
  productFixture,
  RecordingOutbox,
} from '../../../../test/fakes/catalog.fakes.js';
import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import type { PrismaProcessedEventStore } from '../../events/prisma-processed-event.store.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { ProductsRepository } from '../../products/repositories/products.repository.js';
import { SellerOrderDeliveredHandler } from '../events/seller-order-delivered.handler.js';
import { ReviewsRepository } from '../repositories/reviews.repository.js';
import { ReviewsService } from '../services/reviews.service.js';

import { ProductReviewsController } from './product-reviews.controller.js';

describe('ProductReviewsController (HTTP)', () => {
  let app: INestApplication;
  let reviews: InMemoryReviewsRepository;

  beforeEach(async () => {
    reviews = new InMemoryReviewsRepository();
    app = await createCatalogTestApp(
      [ProductReviewsController],
      [
        ReviewsService,
        { provide: ReviewsRepository, useValue: reviews },
        {
          provide: ProductsRepository,
          useValue: new InMemoryProductsRepository([productFixture({ id: 'p1', slug: 'vase' })]),
        },
        { provide: TransactionManager, useClass: ImmediateTransactionManager },
        { provide: EventOutbox, useClass: RecordingOutbox },
        { provide: CacheStore, useClass: InMemoryCacheStore },
      ],
    );
  });

  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer() as Server);

  it('unlocks the review after delivery, then accepts it once', async () => {
    const shopper = bearer(UserRole.Shopper, 'linh');
    expect(
      (await http().get('/api/v1/products/vase/reviews/eligibility').set('authorization', shopper))
        .body,
    ).toEqual({
      canReview: false,
      hasReviewed: false,
    });
    await http()
      .post('/api/v1/products/vase/reviews')
      .set('authorization', shopper)
      .send({ rating: 5, comment: 'x', locale: 'en' })
      .expect(403);

    const store = {
      runOnce: (_id: string, work: (t: never) => Promise<void>) =>
        work({} as never).then(() => true),
    };
    await new SellerOrderDeliveredHandler(
      store as unknown as PrismaProcessedEventStore,
      reviews,
    ).handle(
      EventFactory.create({
        type: EventType.SellerOrderDelivered,
        aggregateId: 'o1',
        payload: {
          orderId: 'o1',
          sellerOrderId: 'so1',
          sellerId: 's1',
          shopperId: 'linh',
          productIds: ['p1'],
        },
      }),
    );

    const created = await http()
      .post('/api/v1/products/vase/reviews')
      .set('authorization', shopper)
      .send({ rating: 5, comment: '  Beautiful  ', locale: 'vi' })
      .expect(201);
    expect(created.body).toMatchObject({ rating: 5, comment: 'Beautiful', locale: 'vi' });
    await http()
      .post('/api/v1/products/vase/reviews')
      .set('authorization', shopper)
      .send({ rating: 4, comment: '', locale: 'vi' })
      .expect(409);
    expect((await http().get('/api/v1/products/vase/reviews').expect(200)).body.total).toBe(1);
  });

  it('validates the rating and needs a signed-in user to post', async () => {
    await http()
      .post('/api/v1/products/vase/reviews')
      .send({ rating: 5, comment: '', locale: 'en' })
      .expect(401);
    await http()
      .post('/api/v1/products/vase/reviews')
      .set('authorization', bearer(UserRole.Shopper, 'linh'))
      .send({ rating: 6, comment: '', locale: 'en' })
      .expect(400);
  });
});
