import type { EventType } from '@bazaar/contracts';

/** What the browser receives: which order changed and how — it reloads the order itself. */
export interface OrderLiveEvent {
  orderId: string;
  type: EventType;
  occurredAt: string;
}
