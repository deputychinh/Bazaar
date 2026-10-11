import { EventFactory, EventType } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import type { Product } from '../../../interfaces/product.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { EventOutbox } from '../../outbox/event-outbox.js';

type ProductEventType =
  EventType.ProductPublished | EventType.ProductUpdated | EventType.ProductHidden;

/** Writes catalog.events for product changes through the outbox (plan §5.2). */
@Injectable()
export class ProductEvents {
  public constructor(private readonly outbox: EventOutbox) {}

  public async record(
    type: ProductEventType,
    product: Product,
    transaction: Transaction,
  ): Promise<void> {
    await this.outbox.add(
      EventFactory.create({
        type,
        aggregateId: product.id,
        payload: { productId: product.id, shopId: product.shopId, slug: product.slug },
      }),
      transaction,
    );
  }
}
