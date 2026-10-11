import { Module } from '@nestjs/common';

import { ShopsModule } from '../shops/shops.module.js';

import { EventConsumerRunner } from './event-consumer.runner.js';

@Module({
  imports: [ShopsModule],
  providers: [EventConsumerRunner],
})
export class EventsModule {}
