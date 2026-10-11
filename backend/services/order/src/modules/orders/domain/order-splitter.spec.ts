import { pricedLine } from '../../../../test/fakes/order.fakes.js';

import { OrderSplitter } from './order-splitter.js';

describe('OrderSplitter', () => {
  it('makes one seller order per seller with exact cent subtotals', () => {
    const groups = OrderSplitter.split([
      pricedLine({ quantity: 3, unitPriceUsdCents: 333 }),
      pricedLine({
        sellerId: 'seller-2',
        shopId: 'shop-2',
        shopName: 'Bát Tràng',
        variantSku: 'MUG',
        unitPriceUsdCents: 999,
      }),
      pricedLine({ variantSku: 'LAN-BLUE', unitPriceUsdCents: 1800 }),
    ]);

    expect(
      groups.map((group) => [group.sellerId, group.items.length, group.subtotalUsdCents]),
    ).toEqual([
      ['seller-1', 2, 999 + 1800],
      ['seller-2', 1, 999],
    ]);
    expect(OrderSplitter.total(groups)).toBe(3798);
  });
});
