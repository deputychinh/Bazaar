import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { DisplayCurrency } from '@bazaar/contracts';
import { FixedClock } from '@bazaar/nest-common';

import { NOW } from '../../../../test/fakes/auth.fakes.js';
import { AppConfig } from '../../../config/app-config.js';
import { gatewayEnvSchema } from '../../../config/env.schema.js';

import { HttpFxRateProvider } from './http-fx-rate.provider.js';

describe('HttpFxRateProvider', () => {
  let server: Server;
  let reply: { status: number; body: unknown };
  let provider: HttpFxRateProvider;

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(reply.status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(reply.body));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v6/latest/USD`;
    provider = new HttpFxRateProvider(
      new AppConfig(
        gatewayEnvSchema.parse({
          IDENTITY_DATABASE_URL: 'mysql://t',
          REDIS_URL: 'redis://t',
          KAFKA_BROKERS: 'k:1',
          FX_API_URL: url,
        }),
      ),
      new FixedClock(NOW),
    );
  });

  afterAll(() => {
    server.close();
  });

  it('reads USD → VND from the provider', async () => {
    reply = { status: 200, body: { result: 'success', rates: { USD: 1, VND: 25_431.5 } } };

    await expect(provider.fetchRates()).resolves.toEqual({
      base: DisplayCurrency.Usd,
      rates: { USD: 1, VND: 25_431.5 },
      fetchedAt: NOW.toISOString(),
      source: '127.0.0.1',
    });
  });

  it('fails on an error status or a body without VND', async () => {
    reply = { status: 503, body: {} };
    await expect(provider.fetchRates()).rejects.toThrow('FX provider answered 503');

    reply = { status: 200, body: { rates: { EUR: 0.9 } } };
    await expect(provider.fetchRates()).rejects.toThrow();
  });
});
