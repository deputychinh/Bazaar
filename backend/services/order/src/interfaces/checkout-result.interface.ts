import type { Order } from './order.interface.js';

export interface CheckoutResult {
  order: Order;
  /** False when the Idempotency-Key was seen before and the earlier order is returned. */
  created: boolean;
}
