import type { Server } from 'node:http';

import { ErrorCode, UserStatus } from '@bazaar/contracts';
import request from 'supertest';

import { tokenFromLink } from '../../../../test/fakes/auth.fakes.js';
import {
  createGatewayTestApp,
  type GatewayTestApp,
} from '../../../../test/fakes/gateway-test-app.js';

const PASSWORD = 'Correct-Horse-9';

describe('AuthController (HTTP)', () => {
  let ctx: GatewayTestApp;
  let http: () => ReturnType<typeof request>;

  beforeEach(async () => {
    ctx = await createGatewayTestApp();
    http = () => request(ctx.app.getHttpServer() as Server);
  });

  afterEach(async () => {
    await ctx.app.close();
  });

  const refreshCookie = (headers: Record<string, unknown>): string => {
    const cookies = headers['set-cookie'] as string[] | undefined;
    return cookies?.find((cookie) => cookie.startsWith('bazaar_refresh=')) ?? '';
  };
  const hintCookie = (headers: Record<string, unknown>): string => {
    const cookies = headers['set-cookie'] as string[] | undefined;
    return cookies?.find((cookie) => cookie.startsWith('bazaar_session=')) ?? '';
  };

  it('registers a shopper without exposing the password hash', async () => {
    const response = await http()
      .post('/api/v1/auth/register')
      .send({ email: ' Linh@Bazaar.TEST ', password: PASSWORD, preferredLocale: 'vi' })
      .expect(201);

    expect(response.body).toMatchObject({
      email: 'linh@bazaar.test',
      status: UserStatus.PendingVerification,
      preferredLocale: 'vi',
    });
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('validates the body and refuses a duplicate email', async () => {
    const short = await http()
      .post('/api/v1/auth/register')
      .send({ email: 'a@bazaar.test', password: 'short' })
      .expect(400);
    expect(short.body.code).toBe(ErrorCode.ValidationFailed);

    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'a@bazaar.test', password: PASSWORD })
      .expect(201);
    const duplicate = await http()
      .post('/api/v1/auth/register')
      .send({ email: 'a@bazaar.test', password: PASSWORD })
      .expect(409);
    expect(duplicate.body.code).toBe(ErrorCode.EmailAlreadyRegistered);
  });

  it('verifies the email, then signs in with a secure refresh cookie', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'a@bazaar.test', password: PASSWORD })
      .expect(201);
    await http()
      .post('/api/v1/auth/verify-email')
      .send({ token: tokenFromLink(ctx.outbox.events[1]) })
      .expect(204);

    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'a@bazaar.test', password: PASSWORD })
      .expect(200);

    expect(login.body).toMatchObject({
      expiresIn: 900,
      user: { email: 'a@bazaar.test', status: UserStatus.Active },
    });
    const cookie = refreshCookie(login.headers);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth');
    // The hint is script-readable and secret-free: it only says "a session may exist".
    const hint = hintCookie(login.headers);
    expect(hint).toMatch(/^bazaar_session=1;/);
    expect(hint).not.toContain('HttpOnly');
    expect(hint).toContain('Path=/;');
  });

  it('answers wrong credentials with 401 and the same code for unknown emails', async () => {
    ctx.users.seed({ email: 'tom@bazaar.test' });

    const wrong = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'tom@bazaar.test', password: 'nope' })
      .expect(401);
    const unknown = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'x@bazaar.test', password: 'nope' })
      .expect(401);

    expect(wrong.body.code).toBe(ErrorCode.InvalidCredentials);
    expect(unknown.body.code).toBe(ErrorCode.InvalidCredentials);
  });

  it('protects /me with the access token', async () => {
    ctx.users.seed({ email: 'tom@bazaar.test' });
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'tom@bazaar.test', password: PASSWORD });

    await http().get('/api/v1/auth/me').expect(401);
    const me = await http()
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${login.body.accessToken as string}`)
      .expect(200);

    expect(me.body.email).toBe('tom@bazaar.test');
  });

  it('rotates the refresh cookie and rejects the old one', async () => {
    ctx.users.seed({ email: 'tom@bazaar.test' });
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'tom@bazaar.test', password: PASSWORD });
    const first = refreshCookie(login.headers).split(';')[0] ?? '';

    const refreshed = await http().post('/api/v1/auth/refresh').set('cookie', first).expect(200);
    const second = refreshCookie(refreshed.headers).split(';')[0] ?? '';

    expect(second).not.toBe(first);
    const reused = await http().post('/api/v1/auth/refresh').set('cookie', first).expect(401);
    expect(hintCookie(reused.headers)).toContain('Expires=Thu, 01 Jan 1970');
    await http().post('/api/v1/auth/refresh').set('cookie', second).expect(401);
  });

  it('logs out by clearing the cookie and revoking the session', async () => {
    ctx.users.seed({ email: 'tom@bazaar.test' });
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'tom@bazaar.test', password: PASSWORD });
    const cookie = refreshCookie(login.headers).split(';')[0] ?? '';

    const logout = await http().post('/api/v1/auth/logout').set('cookie', cookie).expect(204);

    expect(refreshCookie(logout.headers)).toContain('Expires=Thu, 01 Jan 1970');
    expect(hintCookie(logout.headers)).toContain('Expires=Thu, 01 Jan 1970');
    await http().post('/api/v1/auth/refresh').set('cookie', cookie).expect(401);
  });

  it('resets a forgotten password and accepts the new one', async () => {
    ctx.users.seed({ email: 'tom@bazaar.test' });

    await http()
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'tom@bazaar.test' })
      .expect(202);
    await http()
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ghost@bazaar.test' })
      .expect(202);
    await http()
      .post('/api/v1/auth/reset-password')
      .send({ token: tokenFromLink(ctx.outbox.events[0]), password: 'New-Password-77' })
      .expect(204);

    await http()
      .post('/api/v1/auth/login')
      .send({ email: 'tom@bazaar.test', password: 'New-Password-77' })
      .expect(200);
  });

  it('accepts resend requests without revealing whether the email exists', async () => {
    await http()
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'ghost@bazaar.test' })
      .expect(202);
  });

  it('slows down password guessing with the strict rate limit', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await http()
        .post('/api/v1/auth/login')
        .send({ email: 'tom@bazaar.test', password: 'guess' })
        .expect(401);
    }

    const blocked = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'tom@bazaar.test', password: 'guess' })
      .expect(429);

    expect(blocked.body.code).toBe(ErrorCode.RateLimited);
    expect(blocked.headers['retry-after']).toBe('60');
  });

  it('serves the public key set without authentication', async () => {
    const response = await http().get('/.well-known/jwks.json').expect(200);

    expect(response.body.keys[0]).toMatchObject({ kty: 'RSA', kid: 'bazaar-gateway-1' });
  });
});
