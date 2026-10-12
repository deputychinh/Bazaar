import { Module } from '@nestjs/common';

import { LiveConsumerRunner } from './live-consumer.runner.js';
import { OrderStreamController } from './order-stream.controller.js';
import { OrderStreamHub } from './order-stream.hub.js';

/** Must be imported before the order proxy, so GET /orders/stream is served here. */
@Module({
  controllers: [OrderStreamController],
  providers: [OrderStreamHub, LiveConsumerRunner],
})
export class LiveModule {}
