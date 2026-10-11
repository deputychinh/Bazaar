import type { Server } from 'node:http';

import { ErrorCode, UserRole } from '@bazaar/contracts';
import { CacheStore, InMemoryCacheStore } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createCatalogTestApp } from '../../../../test/fakes/catalog-test-app.js';
import {
  bearer,
  category,
  ImmediateTransactionManager,
  InMemoryCategoriesRepository,
  InMemoryProductsRepository,
  InMemoryShopsRepository,
  NO_TRANSACTION,
  RecordingOutbox,
} from '../../../../test/fakes/catalog.fakes.js';
import { ImageUrlBuilder } from '../../../common/storage/image-url.builder.js';
import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { AppConfig } from '../../../config/app-config.js';
import { catalogEnvSchema } from '../../../config/env.schema.js';
import { CategoriesRepository } from '../../categories/repositories/categories.repository.js';
import { CategoriesService } from '../../categories/services/categories.service.js';
import { EventOutbox } from '../../outbox/event-outbox.js';
import { ShopsRepository } from '../../shops/repositories/shops.repository.js';
import { ShopsService } from '../../shops/services/shops.service.js';
import { ProductsRepository } from '../repositories/products.repository.js';
import { ProductEvents } from '../services/product-events.js';
import { ProductPresenter } from '../services/product-presenter.js';
import { SellerProductsService } from '../services/seller-products.service.js';

import { SellerProductsController } from './seller-products.controller.js';

const CATEGORY_ID = 'ca0000000000000000000005';
const body = {
  title: { en: 'Silk scarf', vi: 'Khăn lụa' },
  description: { en: 'Woven in Hà Đông.', vi: 'Dệt tại Hà Đông.' },
  categoryId: CATEGORY_ID,
  variants: [{ sku: 'scarf-red', priceUsdCents: 3200, stock: 5 }],
};

describe('Seller products (HTTP)', () => {
  let app: INestApplication;
  let http: () => ReturnType<typeof request>;
  const seller = bearer(UserRole.Seller, 'seller-1');

  beforeEach(async () => {
    const shops = new InMemoryShopsRepository();
    await new ShopsService(shops).provisionForSeller(
      { userId: 'seller-1', applicationId: 'a', shopName: 'Lụa Lan' },
      NO_TRANSACTION,
    );
    app = await createCatalogTestApp(
      [SellerProductsController],
      [
        SellerProductsService,
        ProductPresenter,
        ProductEvents,
        ImageUrlBuilder,
        CategoriesService,
        {
          provide: AppConfig,
          useValue: new AppConfig(
            catalogEnvSchema.parse({
              CATALOG_DATABASE_URL: 'mongodb://t',
              REDIS_URL: 'redis://t',
              KAFKA_BROKERS: 'k:1',
              STORAGE_ACCESS_KEY: 'k',
              STORAGE_SECRET_KEY: 's',
            }),
          ),
        },
        { provide: CacheStore, useValue: new InMemoryCacheStore() },
        { provide: ShopsRepository, useValue: shops },
        { provide: ProductsRepository, useValue: new InMemoryProductsRepository() },
        {
          provide: CategoriesRepository,
          useValue: new InMemoryCategoriesRepository([
            category({ id: CATEGORY_ID, slug: 'silk', path: '/silk' }),
          ]),
        },
        { provide: EventOutbox, useValue: new RecordingOutbox() },
        { provide: TransactionManager, useValue: new ImmediateTransactionManager() },
      ],
    );
    http = () => request(app.getHttpServer() as Server);
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a draft (SKU upper-cased), publishes it and lists it', async () => {
    const created = await http()
      .post('/api/v1/seller/products')
      .set('authorization', seller)
      .send(body)
      .expect(201);
    expect(created.body).toMatchObject({
      status: 'DRAFT',
      slug: 'silk-scarf',
      variants: [{ sku: 'SCARF-RED' }],
      hiddenReason: null,
    });

    await http()
      .post(`/api/v1/seller/products/${created.body.id as string}/publish`)
      .set('authorization', seller)
      .expect(200);
    const list = await http()
      .get('/api/v1/seller/products?status=PUBLISHED')
      .set('authorization', seller)
      .expect(200);

    expect(list.body).toMatchObject({
      total: 1,
      items: [{ id: created.body.id, status: 'PUBLISHED' }],
    });
  });

  it('answers 409 for an invalid transition and 400 for a bad body', async () => {
    const created = await http()
      .post('/api/v1/seller/products')
      .set('authorization', seller)
      .send(body);

    const conflict = await http()
      .post(`/api/v1/seller/products/${created.body.id as string}/unpublish`)
      .set('authorization', seller)
      .expect(409);
    expect(conflict.body.code).toBe(ErrorCode.Conflict);
    const invalid = await http()
      .post('/api/v1/seller/products')
      .set('authorization', seller)
      .send({ ...body, variants: [{ sku: 'x', priceUsdCents: 0, stock: -1 }] })
      .expect(400);
    expect(invalid.body.code).toBe(ErrorCode.ValidationFailed);
  });

  it('is only for sellers', async () => {
    await http()
      .get('/api/v1/seller/products')
      .set('authorization', bearer(UserRole.Shopper, 'u1'))
      .expect(403);
    await http().get('/api/v1/seller/products').expect(401);
  });
});
