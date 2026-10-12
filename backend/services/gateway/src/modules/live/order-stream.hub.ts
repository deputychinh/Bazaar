import { Injectable, type MessageEvent } from '@nestjs/common';
import { filter, interval, map, merge, type Observable, Subject } from 'rxjs';

import { SSE_HEARTBEAT_MS } from '../../constants/live.constant.js';
import type { OrderLiveEvent } from '../../interfaces/order-live-event.interface.js';

/**
 * In-memory fan-out on this pod: order events in, each connected shopper's own events out.
 * Shoppers connected to another pod are served by that pod's own consumer group.
 */
@Injectable()
export class OrderStreamHub {
  private readonly events = new Subject<{ shopperId: string; event: OrderLiveEvent }>();

  public publish(shopperId: string, event: OrderLiveEvent): void {
    this.events.next({ shopperId, event });
  }

  /** The shopper's order events, plus a heartbeat so idle connections stay open. */
  public stream(shopperId: string): Observable<MessageEvent> {
    const mine = this.events.pipe(
      filter((item) => item.shopperId === shopperId),
      map((item): MessageEvent => ({ type: 'order', data: item.event })),
    );
    const heartbeat = interval(SSE_HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ type: 'ping', data: '' })),
    );
    return merge(mine, heartbeat);
  }
}
