import { Topic } from '@bazaar/contracts';
import { EventConsumer } from '@bazaar/nest-common';
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';

import { CATALOG_CONSUMER_GROUP } from '../../constants/kafka.constant.js';
import { SellerApprovedHandler } from '../shops/events/seller-approved.handler.js';
import { OrderCancelledHandler } from '../stock/events/order-cancelled.handler.js';
import { OrderCreatedHandler } from '../stock/events/order-created.handler.js';
import { SellerOrderCancelledHandler } from '../stock/events/seller-order-cancelled.handler.js';

/** Subscribes the catalog to the topics it reacts to once the app is up. */
@Injectable()
export class EventConsumerRunner implements OnApplicationBootstrap {
  public constructor(
    private readonly consumer: EventConsumer,
    private readonly sellerApproved: SellerApprovedHandler,
    private readonly orderCreated: OrderCreatedHandler,
    private readonly orderCancelled: OrderCancelledHandler,
    private readonly sellerOrderCancelled: SellerOrderCancelledHandler,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.consumer.start({
      groupId: CATALOG_CONSUMER_GROUP,
      topics: [Topic.IdentityEvents, Topic.OrderEvents],
      handlers: [
        this.sellerApproved,
        this.orderCreated,
        this.orderCancelled,
        this.sellerOrderCancelled,
      ],
    });
  }
}
