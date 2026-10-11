import type { Server } from 'node:http';

import { EventType, UserRole } from '@bazaar/contracts';
import { AppConfigLoader, OutboxRelay, RedisService } from '@bazaar/nest-common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module.js';
import { AppSetup } from '../../src/app.setup.js';
import { gatewayEnvSchema } from '../../src/config/env.schema.js';
import { RATE_LIMIT_KEY_PREFIX } from '../../src/constants/rate-limit.constant.js';
import { Argon2PasswordHasher } from '../../src/infrastructure/crypto/argon2-password-hasher.js';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service.js';

const PASSWORD = 'Correct-Horse-9';
const runId = Date.now().toString(36);

const waitFor = async (condition: () => Promise<boolean>, timeoutMs = 15_000): Promise<void> => {
  const startedAt = Date.now();
  while (!(await condition())) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`condition not met within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

describe('Gateway (MySQL + Redis + Kafka)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => ReturnType<typeof request>;

  const latestEvent = async (userId: string, type: EventType): Promise<{ link?: string }> => {
    const rows = await prisma.outboxMessage.findMany({
      where: { msgKey: userId },
      orderBy: { id: 'desc' },
    });
    const row = rows.find(
      (candidate) => (JSON.parse(candidate.value) as { type: EventType }).type === type,
    );
    return (JSON.parse(row?.value ?? '{}') as { payload?: { link?: string } }).payload ?? {};
  };
  const tokenOf = (link: string | undefined): string =>
    new URL(link ?? 'http://x').searchParams.get('token') ?? '';
  const cookieOf = (headers: Record<string, unknown>): string =>
    ((headers['set-cookie'] as string[] | undefined) ?? [])
      .find((cookie) => cookie.startsWith('bazaar_refresh='))
      ?.split(';')[0] ?? '';

  beforeAll(async () => {
    const env = AppConfigLoader.load(gatewayEnvSchema);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
    }).compile();
    app = moduleRef.createNestApplication();
    AppSetup.configure(app, env);
    await app.init();
    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer() as Server);
    // Start every run with empty rate-limit counters (same client IP across runs).
    const redis = app.get(RedisService).client;
    for await (const keys of redis.scanIterator({ MATCH: `${RATE_LIMIT_KEY_PREFIX}:*` })) {
      if (keys.length > 0) await redis.del(keys);
    }
  });

  afterAll(async () => {
    app.get(OutboxRelay).stop();
    await app.close();
  });

  it('is ready when MySQL, Redis and Kafka answer', async () => {
    const response = await http().get('/health/ready').expect(200);

    expect(response.body.checks.map((check: { name: string }) => check.name)).toEqual([
      'mysql',
      'redis',
      'kafka',
    ]);
  });

  it('runs the account lifecycle end to end', async () => {
    const email = `it-${runId}@bazaar.test`;

    const registered = await http()
      .post('/api/v1/auth/register')
      .send({ email, password: PASSWORD, preferredLocale: 'vi' })
      .expect(201);
    const userId = registered.body.id as string;
    await waitFor(
      async () =>
        (await prisma.outboxMessage.count({ where: { msgKey: userId, sentAt: { not: null } } })) ===
        2,
    );

    await http().post('/api/v1/auth/login').send({ email, password: PASSWORD }).expect(403);
    const verification = await latestEvent(userId, EventType.EmailVerificationRequested);
    expect(verification.link).toContain('/vi/verify-email?token=');
    await http()
      .post('/api/v1/auth/verify-email')
      .send({ token: tokenOf(verification.link) })
      .expect(204);

    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    const firstCookie = cookieOf(login.headers);
    await http()
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${login.body.accessToken as string}`)
      .expect(200);

    const refreshed = await http()
      .post('/api/v1/auth/refresh')
      .set('cookie', firstCookie)
      .expect(200);
    await http().post('/api/v1/auth/refresh').set('cookie', firstCookie).expect(401);
    await http()
      .post('/api/v1/auth/refresh')
      .set('cookie', cookieOf(refreshed.headers))
      .expect(401);
    expect(await prisma.refreshToken.count({ where: { userId, revokedAt: null } })).toBe(0);

    await http().post('/api/v1/auth/forgot-password').send({ email }).expect(202);
    const reset = await latestEvent(userId, EventType.PasswordResetRequested);
    await http()
      .post('/api/v1/auth/reset-password')
      .send({ token: tokenOf(reset.link), password: 'New-Password-77' })
      .expect(204);
    await http()
      .post('/api/v1/auth/login')
      .send({ email, password: 'New-Password-77' })
      .expect(200);
  });

  it('lets an admin turn a shopper into a seller', async () => {
    const hasher = new Argon2PasswordHasher();
    const admin = await prisma.user.create({
      data: {
        email: `it-admin-${runId}@bazaar.test`,
        passwordHash: await hasher.hash(PASSWORD),
        role: UserRole.Admin,
        status: 'ACTIVE',
        preferredLocale: 'en',
      },
    });
    const shopper = await prisma.user.create({
      data: {
        email: `it-shop-${runId}@bazaar.test`,
        passwordHash: await hasher.hash(PASSWORD),
        role: UserRole.Shopper,
        status: 'ACTIVE',
        preferredLocale: 'vi',
      },
    });
    const bearer = async (email: string): Promise<string> =>
      `Bearer ${(await http().post('/api/v1/auth/login').send({ email, password: PASSWORD })).body.accessToken as string}`;

    const applied = await http()
      .post('/api/v1/seller-applications')
      .set('authorization', await bearer(shopper.email))
      .send({ shopName: 'Nón Lá Huế' })
      .expect(201);
    await http()
      .post(`/api/v1/admin/seller-applications/${applied.body.id as string}/approve`)
      .set('authorization', await bearer(admin.email))
      .expect(200);

    expect((await prisma.user.findUniqueOrThrow({ where: { id: shopper.id } })).role).toBe(
      UserRole.Seller,
    );
    expect(await latestEvent(shopper.id, EventType.SellerApproved)).toMatchObject({
      shopName: 'Nón Lá Huế',
    });
  });

  it('enforces the strict rate limit through Redis', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await http()
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'nobody@bazaar.test' })
        .expect(202);
    }

    await http()
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'nobody@bazaar.test' })
      .expect(429);
  });
});
