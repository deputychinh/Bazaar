import type { Server } from 'node:http';

import { ProductStatus, UserRole } from '@bazaar/contracts';
import { CacheStore, InMemoryCacheStore } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createCatalogTestApp } from '../../../../test/fakes/catalog-test-app.js';
import {
  bearer,
  ImmediateTransactionManager,
  InMemoryProductsRepository,
  productFixture,
  RecordingOutbox,
  testConfig,
} from '../../../../test/fakes/catalog.fakes.js';
import { ImageUrlBuilder } from '../../../common/storage/image-url.builder.js';
import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { AppConfig } from '../../../config/app-config.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { ProductsRepository } from '../repositories/products.repository.js';
import { ProductEvents } from '../services/product-events.js';
import { ProductModerationService } from '../services/product-moderation.service.js';
import { ProductPresenter } from '../services/product-presenter.js';

import { AdminProductsController } from './admin-products.controller.js';

describe('AdminProductsController (HTTP)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createCatalogTestApp(
      [AdminProductsController],
      [
        ProductModerationService,
        ProductPresenter,
        ProductEvents,
        ImageUrlBuilder,
        { provide: AppConfig, useValue: testConfig() },
        {
          provide: ProductsRepository,
          useValue: new InMemoryProductsRepository([
            productFixture({ id: 'p1', slug: 'vase', title: { en: 'Ceramic vase' } }),
            productFixture({
              id: 'p2',
              slug: 'lamp',
              title: { en: 'Silk lamp' },
              status: ProductStatus.Hidden,
            }),
            productFixture({
              id: 'p3',
              slug: 'draft',
              title: { en: 'Draft bowl' },
              status: ProductStatus.Draft,
            }),
          ]),
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
  const admin = bearer(UserRole.Admin, 'admin-1');

  it('lists every product for moderation, filterable by status and title', async () => {
    expect(
      (await http().get('/api/v1/admin/products').set('authorization', admin).expect(200)).body
        .total,
    ).toBe(3);

    const hidden = await http()
      .get('/api/v1/admin/products?status=HIDDEN')
      .set('authorization', admin)
      .expect(200);
    expect(hidden.body.items.map((item: { slug: string }) => item.slug)).toEqual(['lamp']);

    const search = await http()
      .get('/api/v1/admin/products?q=VASE')
      .set('authorization', admin)
      .expect(200);
    expect(search.body.items.map((item: { slug: string }) => item.slug)).toEqual(['vase']);
  });

  it('is for admins only', async () => {
    await http()
      .get('/api/v1/admin/products')
      .set('authorization', bearer(UserRole.Seller, 's'))
      .expect(403);
  });
});
