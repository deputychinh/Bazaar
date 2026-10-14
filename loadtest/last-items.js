// Drill R3 (plan §0.3): 50 shoppers race for the last 5 items. Expect exactly 5 confirmed orders;
// the others are refused (409) or cancelled OUT_OF_STOCK by the saga — never oversold (NFR-05).
import { check } from 'k6';
import http from 'k6/http';

import { API } from './lib.js';

const STOCK = 5;
const BUYERS = Number(__ENV.BUYERS || 50);
const json = { 'content-type': 'application/json' };
const login = (email) =>
  http
    .post(`${API}/api/v1/auth/login`, JSON.stringify({ email, password: 'Bazaar@2026!' }), {
      headers: json,
    })
    .json('accessToken');

export const options = {
  scenarios: {
    race: { executor: 'shared-iterations', vus: BUYERS, iterations: BUYERS, maxDuration: '1m' },
  },
};

export const setup = () => {
  const seller = login('seller.minh@bazaar.test');
  const auth = { ...json, authorization: `Bearer ${seller}` };
  const sku = `R3-${Date.now()}`;
  const created = http.post(
    `${API}/api/v1/seller/products`,
    JSON.stringify({
      title: { en: `Last items ${sku}` },
      description: { en: 'Drill R3: five left, fifty buyers.' },
      categoryId: 'ca0000000000000000000002',
      variants: [{ sku, priceUsdCents: 1000, stock: STOCK }],
    }),
    { headers: auth },
  );
  const id = created.json('id');
  http.post(`${API}/api/v1/seller/products/${id}/publish`, null, { headers: auth });
  const slug = http.get(`${API}/api/v1/seller/products/${id}`, { headers: auth }).json('slug');
  return {
    slug,
    sku,
    tokens: [login('shopper.linh@bazaar.test'), login('shopper.tom@bazaar.test')],
  };
};

export default ({ slug, sku, tokens }) => {
  const response = http.post(
    `${API}/api/v1/orders`,
    JSON.stringify({
      lines: [{ productSlug: slug, variantSku: sku, quantity: 1 }],
      card: { number: '4242424242424242' },
    }),
    {
      headers: {
        ...json,
        authorization: `Bearer ${tokens[__VU % tokens.length]}`,
        'idempotency-key': `r3-${sku}-${__VU}`,
      },
    },
  );
  check(response, { 'answered 201 or 409': (r) => r.status === 201 || r.status === 409 });
};

export const handleSummary = (data) => ({
  stdout: `R3 sku=${data.setup_data.sku} answered=${data.metrics.checks.values.passes}/${BUYERS}\n`,
});
