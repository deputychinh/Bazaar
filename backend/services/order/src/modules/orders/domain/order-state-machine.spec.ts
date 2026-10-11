import { OrderStatus, SellerOrderStatus } from '@bazaar/contracts';

import { InvalidOrderTransitionError } from '../errors/invalid-order-transition.error.js';

import { OrderStateMachine } from './order-state-machine.js';

describe('OrderStateMachine', () => {
  it('lists where each order status can come from', () => {
    expect(OrderStateMachine.sourcesOf(OrderStatus.Reserved)).toEqual([OrderStatus.Pending]);
    expect(OrderStateMachine.sourcesOf(OrderStatus.Cancelled)).toEqual([
      OrderStatus.Pending,
      OrderStatus.Reserved,
      OrderStatus.Paid,
      OrderStatus.Confirmed,
    ]);
    expect(OrderStateMachine.sourcesOf(OrderStatus.Pending)).toEqual([]);
  });

  it('only cancels seller orders before they ship', () => {
    expect(OrderStateMachine.sellerSourcesOf(SellerOrderStatus.Cancelled)).toEqual([
      SellerOrderStatus.Pending,
      SellerOrderStatus.Confirmed,
    ]);
    expect(() =>
      OrderStateMachine.assertSeller(SellerOrderStatus.Shipped, SellerOrderStatus.Cancelled),
    ).toThrow(InvalidOrderTransitionError);
    expect(() =>
      OrderStateMachine.assertSeller(SellerOrderStatus.Confirmed, SellerOrderStatus.Shipped),
    ).not.toThrow();
  });

  it('knows final seller order states', () => {
    expect(OrderStateMachine.isFinal(SellerOrderStatus.Delivered)).toBe(true);
    expect(OrderStateMachine.isFinal(SellerOrderStatus.Cancelled)).toBe(true);
    expect(OrderStateMachine.isFinal(SellerOrderStatus.Shipped)).toBe(false);
  });
});
