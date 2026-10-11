import { EventType, Topic } from '@bazaar/contracts';
import { EventConsumer } from '@bazaar/nest-common';
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';

import { NOTIFICATION_CONSUMER_GROUP } from '../../constants/kafka.constant.js';

import { EventReactions } from './event-reactions.js';
import { PipelineHandler } from './pipeline.handler.js';
import { PrismaProcessedEventStore } from './prisma-processed-event.store.js';

/** Subscribes to every business topic: this service logs and notifies on all of them. */
@Injectable()
export class EventConsumerRunner implements OnApplicationBootstrap {
  public constructor(
    private readonly consumer: EventConsumer,
    private readonly processedEvents: PrismaProcessedEventStore,
    private readonly reactions: EventReactions,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.consumer.start({
      groupId: NOTIFICATION_CONSUMER_GROUP,
      topics: [Topic.IdentityEvents, Topic.OrderEvents, Topic.InventoryEvents, Topic.CatalogEvents],
      handlers: Object.values(EventType).map(
        (type) => new PipelineHandler(type, this.processedEvents, this.reactions),
      ),
    });
  }
}
