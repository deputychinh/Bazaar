import type { Server } from 'node:http';

import { ErrorCode, UserRole } from '@bazaar/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createCatalogTestApp } from '../../../../test/fakes/catalog-test-app.js';
import {
  bearer,
  InMemoryShopsRepository,
  NO_TRANSACTION,
} from '../../../../test/fakes/catalog.fakes.js';
import { ShopsRepository } from '../repositories/shops.repository.js';
import { ShopsService } from '../services/shops.service.js';

import { SellerShopController } from './seller-shop.controller.js';
import { ShopsController } from './shops.controller.js';

describe('Shops (HTTP)', () => {
  let app: INestApplication;
  let http: () => ReturnType<typeof request>;

  beforeEach(async () => {
    const shops = new InMemoryShopsRepository();
    await new ShopsService(shops).provisionForSeller(
      { userId: 'seller-1', applicationId: 'a1', shopName: 'Gốm Minh Long' },
      NO_TRANSACTION,
    );
    app = await createCatalogTestApp(
      [ShopsController, SellerShopController],
      [ShopsService, { provide: ShopsRepository, useValue: shops }],
    );
    http = () => request(app.getHttpServer() as Server);
  });

  afterEach(async () => {
    await app.close();
  });

  it('shows a shop publicly by slug', async () => {
    const response = await http().get('/api/v1/shops/gom-minh-long').expect(200);

    expect(response.body).toMatchObject({ name: 'Gốm Minh Long', status: 'ACTIVE' });
    expect(response.body).not.toHaveProperty('sellerId');
    await http().get('/api/v1/shops/nope').expect(404);
  });

  it('lets the seller read and edit their shop', async () => {
    await http()
      .get('/api/v1/seller/shop')
      .set('authorization', bearer(UserRole.Seller, 'seller-1'))
      .expect(200);

    const updated = await http()
      .patch('/api/v1/seller/shop')
      .set('authorization', bearer(UserRole.Seller, 'seller-1'))
      .send({ description: { en: 'Ceramics from Bát Tràng', vi: 'Gốm Bát Tràng' } })
      .expect(200);

    expect(updated.body.description).toEqual({
      en: 'Ceramics from Bát Tràng',
      vi: 'Gốm Bát Tràng',
    });
  });

  it('refuses shoppers, anonymous callers and empty updates', async () => {
    await http().get('/api/v1/seller/shop').expect(401);
    await http()
      .get('/api/v1/seller/shop')
      .set('authorization', bearer(UserRole.Shopper, 'u1'))
      .expect(403);
    const empty = await http()
      .patch('/api/v1/seller/shop')
      .set('authorization', bearer(UserRole.Seller, 'seller-1'))
      .send({})
      .expect(400);
    expect(empty.body.code).toBe(ErrorCode.ValidationFailed);
  });
});
