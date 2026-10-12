import type { Request, Response } from 'express';

import { testConfig } from '../../../test/fakes/auth.fakes.js';

import { NotificationProxyController } from './notification-proxy.controller.js';
import { OrderProxyController } from './order-proxy.controller.js';
import { ProxyForwarder } from './proxy-forwarder.js';
import type { UpstreamClient } from './upstream-client.js';

describe('service proxies', () => {
  const upstream = {
    forward: vi.fn<(baseUrl: string, request: unknown) => Promise<unknown>>(() =>
      Promise.resolve({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: Buffer.from('{}'),
      }),
    ),
  };
  const proxy = new ProxyForwarder(upstream as unknown as UpstreamClient);
  const request = {
    method: 'GET',
    originalUrl: '/api/v1/orders?page=2',
    headers: { authorization: 'Bearer t' },
    id: 'req-1',
  } as unknown as Request;
  const response = {
    status: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    send: vi.fn(),
  } as unknown as Response;

  it('forward order and notification routes to their service with the request id', async () => {
    await new OrderProxyController(proxy, testConfig()).list(request, response);
    await new OrderProxyController(proxy, testConfig()).forward(request, response);
    await new NotificationProxyController(proxy, testConfig()).forward(request, response);

    expect(upstream.forward.mock.calls.map(([baseUrl]) => baseUrl)).toEqual([
      'http://127.0.0.1:4020',
      'http://127.0.0.1:4020',
      'http://127.0.0.1:4030',
    ]);
    expect(upstream.forward).toHaveBeenCalledWith(
      'http://127.0.0.1:4030',
      expect.objectContaining({
        url: '/api/v1/orders?page=2',
        headers: expect.objectContaining({ 'x-request-id': 'req-1' }),
      }),
    );
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
