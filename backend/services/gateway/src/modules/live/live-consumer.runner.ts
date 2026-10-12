import { hostname } from 'node:os';

import { EVENT_TOPIC, EventType, Topic } from '@bazaar/contracts';
import { EventConsumer } from '@bazaar/nest-common';
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';

import { LIVE_CONSUMER_GROUP_PREFIX } from '../../constants/live.constant.js';

import { LiveOrderHandler } from './live-order.handler.js';
import { OrderStreamHub } from './order-stream.hub.js';

/** Reads order.events in a group of its own (one per pod), from now on. */
@Injectable()
export class LiveConsumerRunner implements OnApplicationBootstrap {
  public constructor(
    private readonly consumer: EventConsumer,
    private readonly hub: OrderStreamHub,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    const orderEventTypes = Object.values(EventType).filter(
      (type) => EVENT_TOPIC[type] === Topic.OrderEvents,
    );
    await this.consumer.start({
      groupId: `${LIVE_CONSUMER_GROUP_PREFIX}-${hostname()}`,
      topics: [Topic.OrderEvents],
      handlers: orderEventTypes.map((type) => new LiveOrderHandler(type, this.hub)),
      fromBeginning: false,
    });
  }
}
