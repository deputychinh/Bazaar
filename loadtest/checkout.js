// The write path under light load: shoppers place orders while reads run (plan §10 "checkout mix").
// Each order goes through the saga (reserve → pay → confirm); check the order funnel in Grafana.
import { check } from 'k6';
import http from 'k6/http';

import { API, pick, productSlugs } from './lib.js';

const SHOPPERS = ['shopper.linh@bazaar.test', 'shopper.tom@bazaar.test'];
const PASSWORD = __ENV.SHOPPER_PASSWORD || 'Bazaar@2026!';

export const options = {
  scenarios: {
    checkout: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.RATE || 2),
      timeUnit: '1s',
      duration: __ENV.DURATION || '1m',
      preAllocatedVUs: 10,
      maxVUs: 30,
    },
  },
  thresholds: {
    'http_req_duration{kind:checkout}': ['p(95)<800'],
    'checks{check:order accepted}': ['rate>0.95'],
  },
};

export const setup = () => {
  const tokens = SHOPPERS.map((email) => {
    const response = http.post(
      `${API}/api/v1/auth/login`,
      JSON.stringify({ email, password: PASSWORD }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
    return response.json('accessToken');
  });
  const lines = productSlugs(2)
    .slice(0, 40)
    .map((slug) => ({
      slug,
      sku: http.get(`${API}/api/v1/products/${slug}`).json('variants.0.sku'),
    }));
  return { tokens, lines };
};

export default ({ tokens, lines }) => {
  const line = pick(lines);
  const response = http.post(
    `${API}/api/v1/orders`,
    JSON.stringify({
      lines: [{ productSlug: line.slug, variantSku: line.sku, quantity: 1 }],
      card: { number: '4242424242424242' },
    }),
    {
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${pick(tokens)}`,
        'idempotency-key': `k6-${__VU}-${__ITER}-${Date.now()}`,
      },
      tags: { kind: 'checkout' },
    },
  );
  // 409 = stock ran out for that variant: a correct answer, not a failure.
  check(response, { 'order accepted': (r) => r.status === 201 || r.status === 409 });
};
