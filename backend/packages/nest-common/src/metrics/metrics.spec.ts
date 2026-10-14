import type { Request } from 'express';

import { UNMATCHED_ROUTE } from '../constants/metrics.constant.js';
import { ConsumeOutcome } from '../enums/consume-outcome.enum.js';

import { HttpMetricsMiddleware } from './http-metrics.middleware.js';
import { KafkaMetrics } from './kafka-metrics.js';
import { MetricsRegistry } from './metrics.registry.js';

const registry = (): MetricsRegistry =>
  new MetricsRegistry({ serviceName: 'catalog', collectDefaults: false });

describe('MetricsRegistry', () => {
  it('labels every series with the service and creates each metric once', async () => {
    const metrics = registry();
    metrics.counter({ name: 'jobs_total', help: 'Jobs' }).inc();
    metrics.counter({ name: 'jobs_total', help: 'Jobs' }).inc();
    expect(await metrics.scrape()).toContain('jobs_total{service="catalog"} 2');
    expect(metrics.contentType).toContain('text/plain');
  });
});

describe('HttpMetricsMiddleware', () => {
  it('labels requests with the matched route template, not the raw URL', () => {
    const matched = {
      baseUrl: '/api/v1',
      route: { path: '/products/:slug' },
    } as unknown as Request;
    expect(HttpMetricsMiddleware.routeOf(matched)).toBe('/api/v1/products/:slug');
    expect(HttpMetricsMiddleware.routeOf({ baseUrl: '' } as Request)).toBe(UNMATCHED_ROUTE);
  });

  it('times a request when the response finishes', async () => {
    const metrics = registry();
    const middleware = new HttpMetricsMiddleware(metrics);
    let finish: () => void = () => undefined;
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/products/vase',
      baseUrl: '/api/v1',
      route: { path: '/products/:slug' },
    } as unknown as Request;
    const response = {
      statusCode: 200,
      once: (_event: string, listener: () => void) => {
        finish = listener;
      },
    };
    const next = vi.fn();
    middleware.use(request, response as never, next);
    finish();

    expect(next).toHaveBeenCalled();
    const count = (await metrics.scrape())
      .split('\n')
      .find((line) => line.startsWith('http_server_request_duration_seconds_count'));
    expect(count).toContain('route="/api/v1/products/:slug"');
    expect(count).toContain('status_code="200"');
    expect(count?.endsWith(' 1')).toBe(true);
  });

  it('leaves /metrics and /health out', () => {
    const metrics = registry();
    const middleware = new HttpMetricsMiddleware(metrics);
    const once = vi.fn();
    middleware.use({ originalUrl: '/metrics' } as Request, { once } as never, vi.fn());
    middleware.use({ originalUrl: '/health/ready' } as Request, { once } as never, vi.fn());
    expect(once).not.toHaveBeenCalled();
  });
});

describe('KafkaMetrics', () => {
  it('counts produced and consumed messages by topic and outcome', async () => {
    const metrics = registry();
    const kafka = new KafkaMetrics(metrics);
    kafka.recordProduced('order.events', true);
    kafka.recordConsumed('order.events', ConsumeOutcome.DeadLettered);
    const scraped = await metrics.scrape();
    expect(scraped).toContain(
      'kafka_messages_produced_total{topic="order.events",result="ok",service="catalog"} 1',
    );
    expect(scraped).toContain(
      'kafka_messages_consumed_total{topic="order.events",outcome="dead_lettered",service="catalog"} 1',
    );
  });

  it('does nothing without a registry', () => {
    expect(() => new KafkaMetrics().recordProduced('t', false)).not.toThrow();
  });
});
