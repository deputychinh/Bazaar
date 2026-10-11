import { Global, Module } from '@nestjs/common';

import { PrismaProcessedEventStore } from './prisma-processed-event.store.js';

/** Event consumption: idempotency store now; handlers and the consumer join with the saga. */
@Global()
@Module({
  providers: [PrismaProcessedEventStore],
  exports: [PrismaProcessedEventStore],
})
export class EventsModule {}
