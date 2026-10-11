import {
  cartChangedProblemSchema,
  checkoutRequestSchema,
  createOrderRequestSchema,
  idempotencyKeySchema,
  orderViewSchema,
} from './checkout.schema.js';

const line = { productSlug: 'lantern', variantSku: 'LAN-1', quantity: 1 };

describe('checkout schemas', () => {
  it('accepts only well-formed retry keys and card numbers', () => {
    expect(idempotencyKeySchema.safeParse('9d86f9d4-3d97-4c22-bbb0-8114f8c27347').success).toBe(
      true,
    );
    expect(idempotencyKeySchema.safeParse('short').success).toBe(false);
    expect(idempotencyKeySchema.safeParse('has spaces in it').success).toBe(false);

    expect(
      checkoutRequestSchema.safeParse({ lines: [line], card: { number: '4242424242424242' } })
        .success,
    ).toBe(true);
    expect(
      checkoutRequestSchema.safeParse({ lines: [line], card: { number: '4242-4242' } }).success,
    ).toBe(false);
  });

  it('requires priced lines for the internal create', () => {
    const priced = {
      ...line,
      productId: 'p1',
      sellerId: 's1',
      shopId: 'sh1',
      shopName: 'Shop',
      title: { en: 'Lantern' },
      variantLabel: { en: 'Red', vi: 'Đỏ' },
      imageUrl: null,
      unitPriceUsdCents: 1500,
    };
    const request = { idempotencyKey: 'key-00000001', card: { number: '4242424242424242' } };
    expect(createOrderRequestSchema.safeParse({ ...request, lines: [priced] }).success).toBe(true);
    expect(createOrderRequestSchema.safeParse({ ...request, lines: [line] }).success).toBe(false);
  });

  it('describes an order and the CART_CHANGED problem', () => {
    const at = '2026-10-11T08:00:00.000Z';
    expect(
      orderViewSchema.safeParse({
        id: 'o1',
        status: 'CONFIRMED',
        totalUsdCents: 1500,
        cancelReason: null,
        payment: { status: 'SUCCEEDED', cardLast4: '4242' },
        sellerOrders: [],
        createdAt: at,
        updatedAt: at,
      }).success,
    ).toBe(true);
    expect(
      cartChangedProblemSchema.safeParse({
        code: 'CART_CHANGED',
        message: 'changed',
        status: 409,
        details: { lines: [{ ...line, available: false, problem: 'NOT_FOUND', stock: null }] },
      }).success,
    ).toBe(true);
  });
});
