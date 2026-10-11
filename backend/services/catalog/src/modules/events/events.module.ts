import { Module } from '@nestjs/common';

import { ShopsModule } from '../shops/shops.module.js';
import { StockModule } from '../stock/stock.module.js';

import { EventConsumerRunner } from './event-consumer.runner.js';

@Module({
  imports: [ShopsModule, StockModule],
  providers: [EventConsumerRunner],
})
export class EventsModule {}
