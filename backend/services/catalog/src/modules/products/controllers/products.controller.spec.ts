import type { Server } from 'node:http';

import { ErrorCode } from '@bazaar/contracts';
import { CacheStore, InMemoryCacheStore } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createCatalogTestApp } from '../../../../test/fakes/catalog-test-app.js';
import {
  category,
  InMemoryCategoriesRepository,
  InMemoryProductsRepository,
  InMemoryShopsRepository,
  NO_TRANSACTION,
  productFixture,
} from '../../../../test/fakes/catalog.fakes.js';
import { ImageUrlBuilder } from '../../../common/storage/image-url.builder.js';
import { AppConfig } from '../../../config/app-config.js';
import { catalogEnvSchema } from '../../../config/env.schema.js';
import { CategoriesController } from '../../categories/controllers/categories.controller.js';
import { CategoriesRepository } from '../../categories/repositories/categories.repository.js';
import { CategoriesService } from '../../categories/services/categories.service.js';
import { ShopsRepository } from '../../shops/repositories/shops.repository.js';
import { ShopsService } from '../../shops/services/shops.service.js';
import { ProductsRepository } from '../repositories/products.repository.js';
import { ProductPresenter } from '../services/product-presenter.js';
import { ProductQueryService } from '../services/product-query.service.js';

import { ProductsController } from './products.controller.js';

const config = new AppConfig(
  catalogEnvSchema.parse({
    CATALOG_DATABASE_URL: 'mongodb://test',
    REDIS_URL: 'redis://test',
    KAFKA_BROKERS: 'localhost:9094',
    STORAGE_ACCESS_KEY: 'k',
    STORAGE_SECRET_KEY: 's',
    STORAGE_PUBLIC_URL: 'https://cdn.bazaar.test/',
  }),
);

describe('Products and categories (HTTP)', () => {
  let app: INestApplication;
  let http: () => ReturnType<typeof request>;

  beforeEach(async () => {
    const shops = new InMemoryShopsRepository();
    const shop = await new ShopsService(shops).provisionForSeller(
      { userId: 'seller-1', applicationId: 'a', shopName: 'Gốm Minh Long' },
      NO_TRANSACTION,
    );
    app = await createCatalogTestApp(
      [ProductsController, CategoriesController],
      [
        ProductQueryService,
        ProductPresenter,
        ImageUrlBuilder,
        CategoriesService,
        { provide: AppConfig, useValue: config },
        { provide: CacheStore, useValue: new InMemoryCacheStore() },
        { provide: ShopsRepository, useValue: shops },
        {
          provide: ProductsRepository,
          useValue: new InMemoryProductsRepository([
            productFixture({ shopId: shop.id }),
            productFixture({
              id: 'p2',
              slug: 'sold-out',
              shopId: shop.id,
              totalStock: 0,
              images: [],
            }),
          ]),
        },
        {
          provide: CategoriesRepository,
          useValue: new InMemoryCategoriesRepository([
            category({ id: 'cat-ceramics', slug: 'ceramics', path: '/ceramics' }),
          ]),
        },
      ],
    );
    http = () => request(app.getHttpServer() as Server);
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists products publicly with image URLs and stock flags', async () => {
    const response = await http().get('/api/v1/products?pageSize=10').expect(200);

    expect(response.body).toMatchObject({ total: 2, page: 1, pageSize: 10 });
    expect(response.body.items[0]).toMatchObject({
      imageUrl: 'https://cdn.bazaar.test/bazaar-images/products/p1/a.webp',
      inStock: true,
    });
    expect(response.body.items[1]).toMatchObject({ imageUrl: null, inStock: false });
  });

  it('shows a product with its shop and without private fields', async () => {
    const response = await http().get('/api/v1/products/ceramic-vase-1').expect(200);

    expect(response.body.shop).toEqual({ slug: 'gom-minh-long', name: 'Gốm Minh Long' });
    expect(response.body).not.toHaveProperty('sellerId');
    expect(response.body).not.toHaveProperty('hiddenReason');
  });

  it('validates query parameters', async () => {
    const response = await http().get('/api/v1/products?pageSize=0').expect(400);
    expect(response.body.code).toBe(ErrorCode.ValidationFailed);
    await http().get('/api/v1/products?sort=relevance').expect(400);
  });

  it('returns the category tree', async () => {
    const response = await http().get('/api/v1/categories').expect(200);

    expect(response.body).toEqual([
      {
        id: 'cat-ceramics',
        slug: 'ceramics',
        name: { en: 'ceramics', vi: 'ceramics' },
        children: [],
      },
    ]);
  });
});
