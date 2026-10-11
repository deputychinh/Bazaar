import { ErrorCode } from '@bazaar/contracts';

import {
  FakeInternalServices,
  outOfStock,
  pricedQuoteLine,
} from '../../../../test/fakes/checkout.fakes.js';
import { CartChangedError } from '../../../common/errors/cart-changed.error.js';

import { CheckoutService } from './checkout.service.js';

const request = {
  lines: [{ productSlug: 'silk-lantern', variantSku: 'LAN-RED', quantity: 1 }],
  card: { number: '4242424242424242' },
};

describe('CheckoutService (gateway)', () => {
  it('quotes the cart, then creates the order with catalog prices only', async () => {
    const services = new FakeInternalServices();
    services.answer = [pricedQuoteLine({ unitPriceUsdCents: 1999, stock: 42 })];

    const result = await new CheckoutService(services).checkout(
      request,
      'key-00000001',
      'Bearer t',
    );

    expect(result.created).toBe(true);
    expect(services.quoted).toEqual([{ lines: request.lines }]);
    const [{ request: sent, authorization }] = services.ordered as [
      (typeof services.ordered)[number],
    ];
    expect(authorization).toBe('Bearer t');
    expect(sent.idempotencyKey).toBe('key-00000001');
    expect(sent.lines[0]).toMatchObject({ unitPriceUsdCents: 1999, sellerId: 'seller-1' });
    // Quote-only fields never reach the order service.
    expect(sent.lines[0]).not.toHaveProperty('stock');
    expect(sent.lines[0]).not.toHaveProperty('available');
  });

  it('stops with CART_CHANGED listing only the lines to fix', async () => {
    const services = new FakeInternalServices();
    services.answer = [pricedQuoteLine(), outOfStock()];

    const error = await new CheckoutService(services)
      .checkout(request, 'key-00000002', 'Bearer t')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CartChangedError);
    expect((error as CartChangedError).code).toBe(ErrorCode.CartChanged);
    expect((error as CartChangedError).details).toEqual({ lines: [outOfStock()] });
    expect(services.ordered).toHaveLength(0);
  });
});
