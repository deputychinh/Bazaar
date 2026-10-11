import type { OrderView } from '@bazaar/contracts';

export interface CreatedOrder {
  order: OrderView;
  /** False when the order service replayed an earlier request with the same key. */
  created: boolean;
}
