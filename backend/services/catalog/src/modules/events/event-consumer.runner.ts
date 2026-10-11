import { Topic } from '@bazaar/contracts';
import { EventConsumer } from '@bazaar/nest-common';
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';

import { CATALOG_CONSUMER_GROUP } from '../../constants/kafka.constant.js';
import { SellerApprovedHandler } from '../shops/events/seller-approved.handler.js';

/** Subscribes the catalog to the topics it reacts to once the app is up. */
@Injectable()
export class EventConsumerRunner implements OnApplicationBootstrap {
  public constructor(
    private readonly consumer: EventConsumer,
    private readonly sellerApproved: SellerApprovedHandler,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.consumer.start({
      groupId: CATALOG_CONSUMER_GROUP,
      topics: [Topic.IdentityEvents],
      handlers: [this.sellerApproved],
    });
  }
}
