import { type AuthenticatedUser, CurrentUser } from '@bazaar/nest-common';
import { Controller, type MessageEvent, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';

import { OrderStreamHub } from './order-stream.hub.js';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderStreamController {
  public constructor(private readonly hub: OrderStreamHub) {}

  /**
   * Server-sent events: `order` events ({ orderId, type, occurredAt }) for the signed-in shopper's
   * orders, and `ping` every 25 s. Clients reload the order when an event arrives.
   */
  @Sse('stream')
  @ApiOperation({ summary: 'Live order changes (text/event-stream)' })
  @ApiProduces('text/event-stream')
  public stream(@CurrentUser() shopper: AuthenticatedUser): Observable<MessageEvent> {
    return this.hub.stream(shopper.id);
  }
}
