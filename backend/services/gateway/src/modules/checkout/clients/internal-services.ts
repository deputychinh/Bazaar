import type { CreateOrderRequest, QuoteRequest, QuoteResponse } from '@bazaar/contracts';

import type { CreatedOrder } from '../../../interfaces/created-order.interface.js';

/** Port to the service-to-service calls checkout needs (catalog quote, order creation). */
export abstract class InternalServices {
  public abstract quote(request: QuoteRequest): Promise<QuoteResponse>;

  /** `authorization` is the shopper's own bearer header, forwarded as is. */
  public abstract createOrder(
    request: CreateOrderRequest,
    authorization: string,
  ): Promise<CreatedOrder>;
}
