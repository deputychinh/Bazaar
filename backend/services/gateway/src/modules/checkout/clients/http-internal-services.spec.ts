import { ErrorCode } from '@bazaar/contracts';
import type { PinoLogger } from 'nestjs-pino';

import { testConfig } from '../../../../test/fakes/auth.fakes.js';
import { orderView, pricedQuoteLine } from '../../../../test/fakes/checkout.fakes.js';
import { UpstreamProblemError } from '../../../common/errors/upstream-problem.error.js';
import { UpstreamUnavailableError } from '../../../common/errors/upstream-unavailable.error.js';
import { AppConfig } from '../../../config/app-config.js';

import { HttpInternalServices } from './http-internal-services.js';

const logger = { setContext: vi.fn(), error: vi.fn() } as unknown as PinoLogger;
const KEY = 'internal-test-key-0123456789abcdef';
const config = new AppConfig({ ...testConfig().env, INTERNAL_API_KEY: KEY });

const answer = (status: number, body: unknown): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(Response.json(body, { status }))),
  );
};

describe('HttpInternalServices', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the internal key and validates the quote', async () => {
    answer(200, { lines: [pricedQuoteLine()] });
    const services = new HttpInternalServices(config, logger);

    expect(
      await services.quote({ lines: [{ productSlug: 'x', variantSku: 'y', quantity: 1 }] }),
    ).toEqual({
      lines: [pricedQuoteLine()],
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('http://127.0.0.1:4010/api/v1/internal/quote');
    expect(init.headers).toMatchObject({ 'x-internal-key': KEY });
  });

  it('forwards the shopper token and tells new orders from replays', async () => {
    const services = new HttpInternalServices(config, logger);
    const request = {
      idempotencyKey: 'key-00000001',
      card: { number: '4242424242424242' },
      lines: [],
    };

    answer(201, orderView());
    expect((await services.createOrder(request, 'Bearer t')).created).toBe(true);
    expect((vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit).headers).toMatchObject({
      authorization: 'Bearer t',
    });

    answer(200, orderView());
    expect((await services.createOrder(request, 'Bearer t')).created).toBe(false);
  });

  it('passes on problem details and hides other failures', async () => {
    const services = new HttpInternalServices(config, logger);
    const request = { lines: [{ productSlug: 'x', variantSku: 'y', quantity: 1 }] };

    answer(400, {
      code: ErrorCode.ValidationFailed,
      message: 'bad',
      status: 400,
      details: { fields: {} },
    });
    await expect(services.quote(request)).rejects.toMatchObject({
      code: ErrorCode.ValidationFailed,
    });
    await expect(services.quote(request)).rejects.toBeInstanceOf(UpstreamProblemError);

    answer(500, { code: ErrorCode.Internal, message: 'boom', status: 500 });
    await expect(services.quote(request)).rejects.toBeInstanceOf(UpstreamUnavailableError);

    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('connection refused'))),
    );
    await expect(services.quote(request)).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });

  it('refuses to call anything without a configured key', async () => {
    await expect(
      new HttpInternalServices(testConfig(), logger).quote({
        lines: [{ productSlug: 'x', variantSku: 'y', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });
});
