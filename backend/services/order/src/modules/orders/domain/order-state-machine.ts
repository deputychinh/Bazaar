import type { OrderStatus, SellerOrderStatus } from '@bazaar/contracts';

import {
  ORDER_TRANSITIONS,
  SELLER_ORDER_TRANSITIONS,
} from '../../../constants/order-transition.constant.js';
import { InvalidOrderTransitionError } from '../errors/invalid-order-transition.error.js';

/** The one place that knows which status may follow which (plan §2B). */
export class OrderStateMachine {
  /** Statuses from which `to` can be reached; repositories update only rows in one of them. */
  public static sourcesOf(to: OrderStatus): OrderStatus[] {
    return (Object.keys(ORDER_TRANSITIONS) as OrderStatus[]).filter((from) =>
      ORDER_TRANSITIONS[from].includes(to),
    );
  }

  public static sellerSourcesOf(to: SellerOrderStatus): SellerOrderStatus[] {
    return (Object.keys(SELLER_ORDER_TRANSITIONS) as SellerOrderStatus[]).filter((from) =>
      SELLER_ORDER_TRANSITIONS[from].includes(to),
    );
  }

  public static assertSeller(from: SellerOrderStatus, to: SellerOrderStatus): void {
    if (!SELLER_ORDER_TRANSITIONS[from].includes(to)) {
      throw new InvalidOrderTransitionError(`Seller order cannot go from ${from} to ${to}`, {
        from,
        to,
      });
    }
  }

  public static isFinal(status: SellerOrderStatus): boolean {
    return SELLER_ORDER_TRANSITIONS[status].length === 0;
  }
}
