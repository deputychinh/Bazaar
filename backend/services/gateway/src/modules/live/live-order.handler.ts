import type { AnyEventEnvelope, EventEnvelope, EventType } from '@bazaar/contracts';
import { BaseEventHandler } from '@bazaar/nest-common';

import type { OrderStreamHub } from './order-stream.hub.js';
import { PassThroughEventStore } from './pass-through-event.store.js';

/** One per order event type: forwards the event to the shopper it concerns. */
export class LiveOrderHandler<TType extends EventType> extends BaseEventHandler<TType, undefined> {
  public constructor(
    public readonly eventType: TType,
    private readonly hub: OrderStreamHub,
  ) {
    super(new PassThroughEventStore());
  }

  protected process(event: EventEnvelope<TType>): Promise<void> {
    const payload = (event as AnyEventEnvelope).payload as { shopperId?: string; orderId?: string };
    if (payload.shopperId !== undefined) {
      this.hub.publish(payload.shopperId, {
        orderId: payload.orderId ?? event.aggregateId,
        type: event.type,
        occurredAt: event.occurredAt,
      });
    }
    return Promise.resolve();
  }
}
