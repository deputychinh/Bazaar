import { createServer, type Server as HttpServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  EventFactory,
  EventType,
  JWT_DEFAULT_AUDIENCE,
  JWT_DEFAULT_ISSUER,
  UserRole,
} from '@bazaar/contracts';
import { AppConfigLoader, EventProducer, OutboxRelay, RedisService } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import request from 'supertest';

import { AppModule } from '../../src/app.module.js';
import { AppSetup } from '../../src/app.setup.js';
import { catalogEnvSchema } from '../../src/config/env.schema.js';
import { CATEGORY_LIST_CACHE_KEY } from '../../src/constants/cache.constant.js';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service.js';

const runId = Date.now().toString(36);
const sellerId = `it-seller-${runId}`;

const waitFor = async (condition: () => Promise<boolean>, timeoutMs = 30_000): Promise<void> => {
  const startedAt = Date.now();
  while (!(await condition())) {
    if (Date.now() - startedAt > timeoutMs)
      throw new Error(`condition not met within ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

describe('Catalog (MongoDB + Redis + Kafka + object storage)', () => {
  let jwks: HttpServer;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => ReturnType<typeof request>;
  let tokenFor: (userId: string, role: UserRole) => Promise<string>;
  let categoryId: string;

  beforeAll(async () => {
    // Stand-in for the gateway's JWKS endpoint.
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'it', alg: 'RS256', use: 'sig' };
    jwks = createServer((_request, response) => response.end(JSON.stringify({ keys: [jwk] })));
    await new Promise<void>((resolve) => jwks.listen(0, '127.0.0.1', resolve));
    process.env.GATEWAY_JWKS_URL = `http://127.0.0.1:${(jwks.address() as AddressInfo).port}/.well-known/jwks.json`;
    tokenFor = async (userId, role) =>
      `Bearer ${await new SignJWT({ email: `${userId}@bazaar.test`, role })
        .setProtectedHeader({ alg: 'RS256', kid: 'it' })
        .setSubject(userId)
        .setIssuer(JWT_DEFAULT_ISSUER)
        .setAudience(JWT_DEFAULT_AUDIENCE)
        .setExpirationTime('5m')
        .sign(privateKey)}`;

    const env = AppConfigLoader.load(catalogEnvSchema);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
    }).compile();
    app = moduleRef.createNestApplication();
    AppSetup.configure(app);
    await app.init();
    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer() as Server);

    const category = await prisma.category.create({
      data: {
        slug: `it-${runId}`,
        name: { en: 'Integration', vi: 'Kiểm thử' },
        path: `/it-${runId}`,
        sortOrder: 99,
      },
    });
    categoryId = category.id;
    await app.get(RedisService).client.del(CATEGORY_LIST_CACHE_KEY);
  });

  afterAll(async () => {
    app.get(OutboxRelay).stop();
    await app.close();
    jwks.close();
  });

  it('is ready when MongoDB, Redis and Kafka answer', async () => {
    const response = await http().get('/health/ready').expect(200);

    expect(response.body.checks.map((check: { name: string }) => check.name)).toEqual([
      'mongodb',
      'redis',
      'kafka',
    ]);
  });

  it('opens a shop when SellerApproved arrives on Kafka', async () => {
    await app.get(EventProducer).publish(
      EventFactory.create({
        type: EventType.SellerApproved,
        aggregateId: sellerId,
        payload: {
          userId: sellerId,
          applicationId: `app-${runId}`,
          shopName: `Gốm Kiểm Thử ${runId}`,
        },
      }),
    );

    await waitFor(async () => (await prisma.shop.findUnique({ where: { sellerId } })) !== null);
    const shop = await prisma.shop.findUniqueOrThrow({ where: { sellerId } });
    await http().get(`/api/v1/shops/${shop.slug}`).expect(200);
  });

  it('runs a product lifecycle: draft → published (event) → search → cached page → update drops cache', async () => {
    const seller = await tokenFor(sellerId, UserRole.Seller);
    const word = `zq${runId}`;
    const created = await http()
      .post('/api/v1/seller/products')
      .set('authorization', seller)
      .send({
        title: { en: `Lantern ${word}`, vi: `Đèn lồng ${word}` },
        description: { en: 'Silk lantern from Hội An, made by hand.' },
        categoryId,
        variants: [{ sku: `IT-${runId}`.toUpperCase(), priceUsdCents: 1800, stock: 7 }],
      })
      .expect(201);
    const productId = created.body.id as string;

    const published = await http()
      .post(`/api/v1/seller/products/${productId}/publish`)
      .set('authorization', seller)
      .expect(200);
    await waitFor(
      async () =>
        (await prisma.outboxMessage.count({
          where: { msgKey: productId, sentAt: { not: null } },
        })) === 1,
    );

    const search = await http().get(`/api/v1/products?q=${word}`).expect(200);
    expect(search.body.items.map((item: { id: string }) => item.id)).toEqual([productId]);

    const slug = published.body.slug as string;
    await http().get(`/api/v1/products/${slug}`).expect(200);
    const redis = app.get(RedisService).client;
    expect(await redis.exists(`catalog:product:${slug}`)).toBe(1);
    await http()
      .patch(`/api/v1/seller/products/${productId}`)
      .set('authorization', seller)
      .send({ variants: [{ sku: `IT-${runId}`.toUpperCase(), priceUsdCents: 1500, stock: 7 }] })
      .expect(200);
    expect(await redis.exists(`catalog:product:${slug}`)).toBe(0);
    expect((await http().get(`/api/v1/products/${slug}`).expect(200)).body.minPriceUsdCents).toBe(
      1500,
    );

    await http()
      .get(`/api/v1/seller/products/${productId}`)
      .set('authorization', await tokenFor('someone-else', UserRole.Seller))
      .expect(404);
  });

  it('uploads an image straight to storage and serves it publicly', async () => {
    const seller = await tokenFor(sellerId, UserRole.Seller);
    const product = (await http().get('/api/v1/seller/products').set('authorization', seller)).body
      .items[0] as { id: string };
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const upload = await http()
      .post(`/api/v1/seller/products/${product.id}/images/upload-url`)
      .set('authorization', seller)
      .send({ contentType: 'image/png', sizeBytes: png.length })
      .expect(200);
    const put = await fetch(upload.body.uploadUrl as string, {
      method: 'PUT',
      headers: upload.body.headers as Record<string, string>,
      body: png,
    });
    expect(put.status).toBe(200);
    const attached = await http()
      .post(`/api/v1/seller/products/${product.id}/images`)
      .set('authorization', seller)
      .send({ key: upload.body.key })
      .expect(200);

    const image = await fetch(attached.body.images[0].url as string);
    expect(image.status).toBe(200);
    expect(image.headers.get('content-type')).toBe('image/png');
  });
});
