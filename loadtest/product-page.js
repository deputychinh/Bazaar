// NFR-02: product page (ISR/SSR) TTFB p95 < 300 ms with a warm cache.
import { check } from 'k6';
import http from 'k6/http';

import { WEB, pick, productSlugs } from './lib.js';

export const options = {
  scenarios: {
    pages: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 30),
      timeUnit: '1s',
      duration: __ENV.DURATION || '1m',
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
  },
  thresholds: {
    // TTFB = time waiting for the first byte.
    'http_req_waiting{kind:page}': ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export const setup = () => {
  const slugs = productSlugs(1).slice(0, 30);
  // Warm the cache once per page: NFR-02 is about warm-cache latency.
  for (const slug of slugs) http.get(`${WEB}/en/p/${slug}`);
  return { slugs };
};

export default ({ slugs }) => {
  const locale = Math.random() < 0.5 ? 'en' : 'vi';
  const response = http.get(`${WEB}/${locale}/p/${pick(slugs)}`, { tags: { kind: 'page' } });
  check(response, { 'status 200': (r) => r.status === 200 });
};
