// The order saga across gateway → catalog → order over Kafka, through public HTTP only.
// Needs the three services running with seeded data (identity + catalog).
import { randomUUID } from 'node:crypto';

const GATEWAY = process.env.E2E_GATEWAY_URL ?? 'http://127.0.0.1:4000';
const SHOPPER = { email: 'shopper.linh@bazaar.test', password: 'Bazaar@2026!' };
const CARD = { ok: '4242424242424242', declined: '4000000000000002', timeout: '4000000000000119' };
const FINAL = new Set(['CONFIRMED', 'COMPLETED', 'CANCELLED']);

interface Variant {
  sku: string;
  stock: number;
}
interface OrderAnswer {
  id: string;
  status: string;
  cancelReason: string | null;
  payment: { status: string } | null;
}

const api = async (path: string, init: RequestInit & { token?: string } = {}): Promise<Response> =>
  fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.token === undefined ? {} : { authorization: `Bearer ${init.token}` }),
      ...init.headers,
    },
  });

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('order saga (end to end)', () => {
  let token: string;
  let product: { slug: string; variant: Variant };

  const variantOf = async (slug: string, sku: string): Promise<Variant> => {
    const detail = (await (await api(`/api/v1/products/${slug}`)).json()) as {
      variants: Variant[];
    };
    return detail.variants.find((variant) => variant.sku === sku) as Variant;
  };

  const place = (card: string, quantity = 1): Promise<Response> =>
    api('/api/v1/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': randomUUID() },
      body: JSON.stringify({
        lines: [{ productSlug: product.slug, variantSku: product.variant.sku, quantity }],
        card: { number: card },
      }),
    });

  /** Polls the order until the saga has decided (CONFIRMED / CANCELLED). */
  const settled = async (id: string): Promise<OrderAnswer> => {
    const deadline = Date.now() + 45_000;
    for (;;) {
      const order = (await (await api(`/api/v1/orders/${id}`, { token })).json()) as OrderAnswer;
      if (FINAL.has(order.status)) return order;
      if (Date.now() > deadline) throw new Error(`order ${id} still ${order.status}`);
      await sleep(300);
    }
  };

  beforeAll(async () => {
    const login = await api('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(SHOPPER),
    });
    expect(login.status).toBe(200);
    token = ((await login.json()) as { accessToken: string }).accessToken;

    // A published variant with a little stock left, so the race below can empty it.
    const page = (await (await api('/api/v1/products?pageSize=60&sort=newest')).json()) as {
      items: { slug: string; inStock: boolean }[];
    };
    for (const item of page.items.filter((candidate) => candidate.inStock)) {
      const detail = (await (await api(`/api/v1/products/${item.slug}`)).json()) as {
        variants: Variant[];
      };
      const variant = detail.variants.find(
        (candidate) => candidate.stock >= 4 && candidate.stock <= 40,
      );
      if (variant !== undefined) {
        product = { slug: item.slug, variant };
        return;
      }
    }
    throw new Error('no seeded product with 4–40 units found');
  });

  it('confirms a paid order and takes its stock', async () => {
    const before = (await variantOf(product.slug, product.variant.sku)).stock;
    const response = await place(CARD.ok);
    expect(response.status).toBe(201);

    const order = await settled(((await response.json()) as OrderAnswer).id);

    expect(order).toMatchObject({ status: 'CONFIRMED', payment: { status: 'SUCCEEDED' } });
    expect((await variantOf(product.slug, product.variant.sku)).stock).toBe(before - 1);
  });

  it.each([
    ['declined', CARD.declined],
    ['timing out', CARD.timeout],
  ])(
    'cancels with PAYMENT_FAILED and gives the stock back when the card is %s',
    async (_name, card) => {
      const before = (await variantOf(product.slug, product.variant.sku)).stock;
      const response = await place(card);
      const order = await settled(((await response.json()) as OrderAnswer).id);

      expect(order).toMatchObject({
        status: 'CANCELLED',
        cancelReason: 'PAYMENT_FAILED',
        payment: { status: 'FAILED' },
      });
      // Released stock comes back once the catalog handles OrderCancelled.
      const deadline = Date.now() + 20_000;
      while (
        (await variantOf(product.slug, product.variant.sku)).stock !== before &&
        Date.now() < deadline
      ) {
        await sleep(300);
      }
      expect((await variantOf(product.slug, product.variant.sku)).stock).toBe(before);
    },
  );

  it('never oversells: concurrent orders for the last units confirm exactly the stock left', async () => {
    const stock = (await variantOf(product.slug, product.variant.sku)).stock;
    const attempts = stock + 5;

    const responses = await Promise.all(Array.from({ length: attempts }, () => place(CARD.ok)));
    // The quote is advisory: late requests may already see an empty shelf (409 CART_CHANGED).
    const placed = responses.filter((response) => response.status === 201);
    const refusedAtQuote = responses.filter((response) => response.status === 409);
    expect(placed.length + refusedAtQuote.length).toBe(attempts);

    const orders = await Promise.all(
      placed.map(async (response) => settled(((await response.json()) as OrderAnswer).id)),
    );
    const confirmed = orders.filter((order) => order.status === 'CONFIRMED');
    const outOfStock = orders.filter((order) => order.cancelReason === 'OUT_OF_STOCK');

    expect(confirmed).toHaveLength(stock);
    expect(confirmed.length + outOfStock.length).toBe(placed.length);
    expect((await variantOf(product.slug, product.variant.sku)).stock).toBe(0);
  });
});
