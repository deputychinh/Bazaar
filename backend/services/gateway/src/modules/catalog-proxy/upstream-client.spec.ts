import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { PinoLogger } from 'nestjs-pino';

import { UpstreamUnavailableError } from '../../common/errors/upstream-unavailable.error.js';

import { UpstreamClient } from './upstream-client.js';

const logger = { setContext: vi.fn(), error: vi.fn() } as unknown as PinoLogger;

describe('UpstreamClient', () => {
  let server: Server;
  let baseUrl: string;
  let lastRequest: {
    method?: string;
    url?: string;
    headers: IncomingMessage['headers'];
    body: string;
  };

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = '';
      request.on('data', (chunk: Buffer) => (body += chunk.toString()));
      request.on('end', () => {
        lastRequest = { method: request.method, url: request.url, headers: request.headers, body };
        response.writeHead(201, {
          'content-type': 'application/json',
          'set-cookie': 'secret=1',
          'cache-control': 'no-store',
        });
        response.end(JSON.stringify({ ok: true }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
  });

  it('forwards method, path, query, body and only safe headers', async () => {
    const answer = await new UpstreamClient(logger).forward(baseUrl, {
      method: 'POST',
      url: '/api/v1/seller/products?draft=1',
      headers: {
        authorization: 'Bearer abc',
        cookie: 'bazaar_refresh=xyz',
        'content-type': 'application/json',
        'x-request-id': 'req-1',
      },
      body: { title: 'Bình gốm' },
    });

    expect(lastRequest).toMatchObject({
      method: 'POST',
      url: '/api/v1/seller/products?draft=1',
      body: '{"title":"Bình gốm"}',
    });
    expect(lastRequest.headers).toMatchObject({
      authorization: 'Bearer abc',
      'x-request-id': 'req-1',
    });
    expect(lastRequest.headers.cookie).toBeUndefined();
    expect(answer.status).toBe(201);
    expect(answer.headers).toEqual({
      'content-type': 'application/json',
      'cache-control': 'no-store',
    });
    expect(JSON.parse(answer.body.toString())).toEqual({ ok: true });
  });

  it('sends no body on GET', async () => {
    await new UpstreamClient(logger).forward(baseUrl, {
      method: 'GET',
      url: '/api/v1/products',
      headers: {},
      body: {},
    });

    expect(lastRequest).toMatchObject({ method: 'GET', body: '' });
  });

  it('answers 502 when the service cannot be reached', async () => {
    await expect(
      new UpstreamClient(logger).forward('http://127.0.0.1:1', {
        method: 'GET',
        url: '/x',
        headers: {},
        body: undefined,
      }),
    ).rejects.toBeInstanceOf(UpstreamUnavailableError);
  });
});
