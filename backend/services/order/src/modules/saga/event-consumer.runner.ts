import { Topic } from '@bazaar/contracts';
import { EventConsumer } from '@bazaar/nest-common';
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';

import { ORDER_CONSUMER_GROUP } from '../../constants/kafka.constant.js';

import { StockRejectedHandler } from './events/stock-rejected.handler.js';
import { StockReservedHandler } from './events/stock-reserved.handler.js';

/** Subscribes the order service to the catalog's stock answers once the app is up. */
@Injectable()
export class EventConsumerRunner implements OnApplicationBootstrap {
  public constructor(
    private readonly consumer: EventConsumer,
    private readonly stockReserved: StockReservedHandler,
    private readonly stockRejected: StockRejectedHandler,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.consumer.start({
      groupId: ORDER_CONSUMER_GROUP,
      topics: [Topic.InventoryEvents],
      handlers: [this.stockReserved, this.stockRejected],
    });
  }
}
