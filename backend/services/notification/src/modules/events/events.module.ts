import { Module } from '@nestjs/common';

import { ContactsRepository } from '../contacts/repositories/contacts.repository.js';
import { PrismaContactsRepository } from '../contacts/repositories/prisma-contacts.repository.js';
import { ContactsReaction } from '../contacts/services/contacts.reaction.js';
import { EventLogRepository } from '../event-log/repositories/event-log.repository.js';
import { PrismaEventLogRepository } from '../event-log/repositories/prisma-event-log.repository.js';
import { EventLogReaction } from '../event-log/services/event-log.reaction.js';

import { EventConsumerRunner } from './event-consumer.runner.js';
import { EventReactions } from './event-reactions.js';
import { PrismaProcessedEventStore } from './prisma-processed-event.store.js';

/** Event consumption: one pipeline per event type running every reaction once. */
@Module({
  providers: [
    PrismaProcessedEventStore,
    EventConsumerRunner,
    EventLogReaction,
    ContactsReaction,
    { provide: EventLogRepository, useClass: PrismaEventLogRepository },
    { provide: ContactsRepository, useClass: PrismaContactsRepository },
    {
      provide: EventReactions,
      inject: [EventLogReaction, ContactsReaction],
      useFactory: (log: EventLogReaction, contacts: ContactsReaction): EventReactions => ({
        all: [log, contacts],
      }),
    },
  ],
  exports: [ContactsRepository],
})
export class EventsModule {}
