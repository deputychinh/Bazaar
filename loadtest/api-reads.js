// NFR-03: public API reads, p95 < 200 ms at 200 requests per second (plan §1.3).
// Mix: product pages 40 %, listings 30 %, search 15 %, categories 15 %.
import { check } from 'k6';
import http from 'k6/http';

import { API, pick, productSlugs } from './lib.js';

const RATE = Number(__ENV.RATE || 200);

export const options = {
  scenarios: {
    reads: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: __ENV.DURATION || '2m',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    'http_req_duration{kind:read}': ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const TERMS = ['vase', 'silk', 'tea', 'knife', 'soap', 'lamp', 'speaker', 'wallet'];

export const setup = () => ({ slugs: productSlugs() });

export default ({ slugs }) => {
  const roll = Math.random();
  let url;
  if (roll < 0.4) url = `${API}/api/v1/products/${pick(slugs)}`;
  else if (roll < 0.7) url = `${API}/api/v1/products?page=${1 + Math.floor(Math.random() * 10)}`;
  else if (roll < 0.85) url = `${API}/api/v1/products?q=${pick(TERMS)}`;
  else url = `${API}/api/v1/categories`;
  const response = http.get(url, { tags: { kind: 'read' } });
  check(response, { 'status 200': (r) => r.status === 200 });
};
