import { createServer, type Server as HttpServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { JWT_DEFAULT_AUDIENCE, JWT_DEFAULT_ISSUER, UserRole } from '@bazaar/contracts';
import { AppConfigLoader, INTERNAL_API_KEY_HEADER } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import request from 'supertest';

import { AppModule } from '../../src/app.module.js';
import { AppSetup } from '../../src/app.setup.js';
import { orderEnvSchema } from '../../src/config/env.schema.js';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service.js';
import { pricedLine } from '../fakes/order.fakes.js';

const runId = Date.now().toString(36);

const waitFor = async (condition: () => Promise<boolean>, timeoutMs = 30_000): Promise<void> => {
  const startedAt = Date.now();
  while (!(await condition())) {
    if (Date.now() - startedAt > timeoutMs)
      throw new Error(`condition not met within ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

describe('Order service (MySQL + Redis + Kafka)', () => {
  let jwks: HttpServer;
  let app: INestApplication;
  let prisma: PrismaService;
  let shopperToken: string;
  let internalKey: string;

  beforeAll(async () => {
    // Stand-in for the gateway's JWKS endpoint.
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'it', alg: 'RS256', use: 'sig' };
    jwks = createServer((_request, response) => response.end(JSON.stringify({ keys: [jwk] })));
    await new Promise<void>((resolve) => jwks.listen(0, '127.0.0.1', resolve));
    process.env.GATEWAY_JWKS_URL = `http://127.0.0.1:${(jwks.address() as AddressInfo).port}/.well-known/jwks.json`;
    shopperToken = `Bearer ${await new SignJWT({
      email: `shopper-${runId}@bazaar.test`,
      role: UserRole.Shopper,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'it' })
      .setSubject(`it-shopper-${runId}`)
      .setIssuer(JWT_DEFAULT_ISSUER)
      .setAudience(JWT_DEFAULT_AUDIENCE)
      .setExpirationTime('5m')
      .sign(privateKey)}`;

    const env = AppConfigLoader.load(orderEnvSchema);
    if (env.INTERNAL_API_KEY === undefined) throw new Error('INTERNAL_API_KEY must be set (.env)');
    internalKey = env.INTERNAL_API_KEY;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
    }).compile();
    app = moduleRef.createNestApplication();
    AppSetup.configure(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    jwks.close();
  });

  const checkout = (key: string): request.Test =>
    request(app.getHttpServer() as Server)
      .post('/api/v1/internal/orders')
      .set({ authorization: shopperToken, [INTERNAL_API_KEY_HEADER]: internalKey })
      .send({
        idempotencyKey: key,
        card: { number: '4242424242424242' },
        lines: [
          pricedLine({ quantity: 2 }),
          pricedLine({
            sellerId: `it-seller-b-${runId}`,
            shopId: 'shop-b',
            productId: 'p2',
            variantSku: 'MUG',
          }),
        ],
      });

  it('stores the order split by seller and publishes OrderCreated through the outbox', async () => {
    const response = await checkout(`it-${runId}-1`).expect(201);
    const orderId = response.body.id as string;

    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { sellerOrders: { include: { items: true } }, payment: true },
    });
    expect(stored).toMatchObject({
      status: 'PENDING',
      totalUsdCents: 4500,
      shopperId: `it-shopper-${runId}`,
    });
    expect(stored.sellerOrders).toHaveLength(2);
    expect(stored.payment?.providerToken).toMatch(/^tok_fake_succeed_/);
    expect(JSON.stringify(stored)).not.toContain('4242424242424242');

    await waitFor(async () => {
      const row = await prisma.outboxMessage.findFirst({ where: { msgKey: orderId } });
      return row?.sentAt !== null && row?.sentAt !== undefined;
    });
  });

  it('replays the same Idempotency-Key without a second order', async () => {
    const first = await checkout(`it-${runId}-2`).expect(201);
    const replay = await checkout(`it-${runId}-2`).expect(200);

    expect(replay.body.id).toBe(first.body.id);
    expect(await prisma.order.count({ where: { idempotencyKey: `it-${runId}-2` } })).toBe(1);
  });
});
