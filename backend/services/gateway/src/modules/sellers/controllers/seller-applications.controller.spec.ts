import type { Server } from 'node:http';

import { ErrorCode, UserRole } from '@bazaar/contracts';
import request from 'supertest';

import {
  createGatewayTestApp,
  type GatewayTestApp,
} from '../../../../test/fakes/gateway-test-app.js';

describe('Seller applications (HTTP)', () => {
  let ctx: GatewayTestApp;
  let http: () => ReturnType<typeof request>;

  beforeEach(async () => {
    ctx = await createGatewayTestApp();
    http = () => request(ctx.app.getHttpServer() as Server);
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  it('lets a shopper apply and an admin approve', async () => {
    const shopper = ctx.users.seed({ role: UserRole.Shopper });
    const admin = ctx.users.seed({ role: UserRole.Admin });

    const applied = await http()
      .post('/api/v1/seller-applications')
      .set('authorization', await ctx.bearerFor(shopper))
      .send({ shopName: '  Gốm Minh Long  ' })
      .expect(201);
    expect(applied.body).toMatchObject({ shopName: 'Gốm Minh Long', status: 'PENDING' });

    const list = await http()
      .get('/api/v1/admin/seller-applications?status=PENDING')
      .set('authorization', await ctx.bearerFor(admin))
      .expect(200);
    expect(list.body).toMatchObject({ items: [{ id: applied.body.id }], nextCursor: null });

    await http()
      .post(`/api/v1/admin/seller-applications/${applied.body.id as string}/approve`)
      .set('authorization', await ctx.bearerFor(admin))
      .expect(200);
    const mine = await http()
      .get('/api/v1/seller-applications/mine')
      .set('authorization', await ctx.bearerFor(shopper))
      .expect(200);
    expect(mine.body[0].status).toBe('APPROVED');
  });

  it('keeps admin routes for admins and applying for shoppers', async () => {
    const shopper = ctx.users.seed({ role: UserRole.Shopper });
    const seller = ctx.users.seed({ role: UserRole.Seller });

    const forbidden = await http()
      .get('/api/v1/admin/seller-applications')
      .set('authorization', await ctx.bearerFor(shopper))
      .expect(403);
    expect(forbidden.body.code).toBe(ErrorCode.Forbidden);
    await http()
      .post('/api/v1/seller-applications')
      .set('authorization', await ctx.bearerFor(seller))
      .send({ shopName: 'Another shop' })
      .expect(403);
    await http().get('/api/v1/admin/seller-applications').expect(401);
  });

  it('rejects with a reason and validates input', async () => {
    const shopper = ctx.users.seed({ role: UserRole.Shopper });
    const admin = ctx.users.seed({ role: UserRole.Admin });
    const applied = await http()
      .post('/api/v1/seller-applications')
      .set('authorization', await ctx.bearerFor(shopper))
      .send({ shopName: 'Tom Tools' });

    await http()
      .post(`/api/v1/admin/seller-applications/${applied.body.id as string}/reject`)
      .set('authorization', await ctx.bearerFor(admin))
      .send({ reason: '' })
      .expect(400);
    const rejected = await http()
      .post(`/api/v1/admin/seller-applications/${applied.body.id as string}/reject`)
      .set('authorization', await ctx.bearerFor(admin))
      .send({ reason: 'Missing business licence' })
      .expect(200);
    expect(rejected.body).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Missing business licence',
    });

    const badLimit = await http()
      .get('/api/v1/admin/seller-applications?limit=500')
      .set('authorization', await ctx.bearerFor(admin))
      .expect(400);
    expect(badLimit.body.code).toBe(ErrorCode.ValidationFailed);
  });
});
