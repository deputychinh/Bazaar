import type { Server } from 'node:http';

import { ErrorCode } from '@bazaar/contracts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createCatalogTestApp } from '../../../../test/fakes/catalog-test-app.js';
import { TEST_INTERNAL_KEY } from '../../../../test/fakes/catalog.fakes.js';
import { QuoteService } from '../services/quote.service.js';

import { InternalQuoteController } from './internal-quote.controller.js';

describe('InternalQuoteController (HTTP)', () => {
  let app: INestApplication;
  const quote = vi.fn(() => Promise.resolve({ lines: [] }));

  beforeEach(async () => {
    app = await createCatalogTestApp(
      [InternalQuoteController],
      [{ provide: QuoteService, useValue: { quote } }],
    );
  });

  afterEach(async () => {
    await app.close();
  });

  const post = (key?: string): request.Test => {
    const call = request(app.getHttpServer() as Server)
      .post('/api/v1/internal/quote')
      .send({ lines: [{ productSlug: 'lantern', variantSku: 'LAN-RED', quantity: 1 }] });
    return key === undefined ? call : call.set('x-internal-key', key);
  };

  it('answers the gateway (internal key, no user token needed)', async () => {
    await post(TEST_INTERNAL_KEY).expect(200, { lines: [] });
    expect(quote).toHaveBeenCalledOnce();
  });

  it('refuses anyone without the internal key', async () => {
    const response = await post().expect(403);
    expect(response.body.code).toBe(ErrorCode.Forbidden);
    await post('guess').expect(403);
    expect(quote).not.toHaveBeenCalled();
  });

  it('validates the body', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/v1/internal/quote')
      .set('x-internal-key', TEST_INTERNAL_KEY)
      .send({ lines: [] })
      .expect(400);
  });
});
