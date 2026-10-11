import type { CartLine } from '@/interfaces/cart.interface';
import { cartLineFixture } from '@/test-utils/cart.fixture';

import {
  addLine,
  cartSubtotalUsdCents,
  groupByShop,
  parseStoredCart,
  setLineQuantity,
} from './cart.util';

const lantern: Omit<CartLine, 'quantity'> = cartLineFixture();

describe('addLine', () => {
  it('adds a new line and tops up an existing one', () => {
    const once = addLine([], lantern, 1);
    const twice = addLine(once, lantern, 2);

    expect(twice).toHaveLength(1);
    expect(twice[0]?.quantity).toBe(3);
  });

  it('never exceeds stock or the per-line limit', () => {
    expect(addLine([], lantern, 99)[0]?.quantity).toBe(5);
    expect(addLine([], { ...lantern, maxQuantity: 50 }, 99)[0]?.quantity).toBe(10);
  });

  it('refreshes the snapshot (price, stock) when the same variant is added again', () => {
    const lines = addLine(addLine([], lantern, 1), { ...lantern, unitPriceUsdCents: 1700 }, 1);
    expect(lines[0]).toMatchObject({ quantity: 2, unitPriceUsdCents: 1700 });
  });
});

describe('setLineQuantity', () => {
  it('changes, clamps and removes at zero', () => {
    const lines = [cartLineFixture({ quantity: 2 })];
    expect(setLineQuantity(lines, 'LAN-RED', 4)[0]?.quantity).toBe(4);
    expect(setLineQuantity(lines, 'LAN-RED', 40)[0]?.quantity).toBe(5);
    expect(setLineQuantity(lines, 'LAN-RED', 0)).toEqual([]);
    expect(setLineQuantity(lines, 'OTHER', 0)).toEqual(lines);
  });
});

describe('totals and grouping', () => {
  it('adds line totals in cents and groups lines by shop', () => {
    const lines = [
      cartLineFixture({ quantity: 2 }),
      cartLineFixture({
        sku: 'MUG',
        unitPriceUsdCents: 999,
        shop: { slug: 'bat-trang', name: 'Bát Tràng' },
      }),
      cartLineFixture({ sku: 'LAN-BLUE', unitPriceUsdCents: 1800 }),
    ];

    expect(cartSubtotalUsdCents(lines)).toBe(3000 + 999 + 1800);
    expect(
      groupByShop(lines).map((group) => [
        group.shop.slug,
        group.lines.length,
        group.subtotalUsdCents,
      ]),
    ).toEqual([
      ['hoi-an-lights', 2, 4800],
      ['bat-trang', 1, 999],
    ]);
  });
});

describe('parseStoredCart', () => {
  it('keeps valid lines and drops anything malformed', () => {
    const raw = JSON.stringify([cartLineFixture(), { sku: 'broken' }, 'nonsense']);
    expect(parseStoredCart(raw)).toEqual([cartLineFixture()]);
    expect(parseStoredCart('{not json')).toEqual([]);
    expect(parseStoredCart('{"a":1}')).toEqual([]);
    expect(parseStoredCart(null)).toEqual([]);
  });
});
