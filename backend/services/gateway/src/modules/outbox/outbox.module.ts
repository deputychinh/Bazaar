import { OutboxRelay, OutboxStore } from '@bazaar/nest-common';
import { Global, Module } from '@nestjs/common';

import { EventOutbox } from './event-outbox.js';
import { OutboxRelayRunner } from './outbox-relay.runner.js';
import { PrismaEventOutbox } from './prisma-event-outbox.js';
import { PrismaOutboxStore } from './prisma-outbox.store.js';

@Global()
@Module({
  providers: [
    { provide: EventOutbox, useClass: PrismaEventOutbox },
    { provide: OutboxStore, useClass: PrismaOutboxStore },
    OutboxRelay,
    OutboxRelayRunner,
  ],
  exports: [EventOutbox],
})
export class OutboxModule {}
