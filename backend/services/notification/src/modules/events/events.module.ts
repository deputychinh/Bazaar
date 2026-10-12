import { Module } from '@nestjs/common';

import { ContactsRepository } from '../contacts/repositories/contacts.repository.js';
import { PrismaContactsRepository } from '../contacts/repositories/prisma-contacts.repository.js';
import { ContactsReaction } from '../contacts/services/contacts.reaction.js';
import { EmailRelayRunner } from '../emails/email-relay.runner.js';
import { EmailQueueRepository } from '../emails/repositories/email-queue.repository.js';
import { PrismaEmailQueueRepository } from '../emails/repositories/prisma-email-queue.repository.js';
import { EmailSender } from '../emails/senders/email-sender.js';
import { SmtpEmailSender } from '../emails/senders/smtp-email-sender.js';
import { EmailRelayService } from '../emails/services/email-relay.service.js';
import { EmailReaction } from '../emails/services/email.reaction.js';
import { EventLogRepository } from '../event-log/repositories/event-log.repository.js';
import { PrismaEventLogRepository } from '../event-log/repositories/prisma-event-log.repository.js';
import { EventLogReaction } from '../event-log/services/event-log.reaction.js';
import { NotificationsController } from '../in-app/controllers/notifications.controller.js';
import { NotificationsRepository } from '../in-app/repositories/notifications.repository.js';
import { PrismaNotificationsRepository } from '../in-app/repositories/prisma-notifications.repository.js';
import { InAppReaction } from '../in-app/services/in-app.reaction.js';
import { OrderSummariesRepository } from '../order-summaries/repositories/order-summaries.repository.js';
import { PrismaOrderSummariesRepository } from '../order-summaries/repositories/prisma-order-summaries.repository.js';
import { OrderSummaryReaction } from '../order-summaries/services/order-summary.reaction.js';

import { AllEventReactions } from './all-event-reactions.js';
import { EventConsumerRunner } from './event-consumer.runner.js';
import { EventReactions } from './event-reactions.js';
import { PrismaProcessedEventStore } from './prisma-processed-event.store.js';

/** Event consumption: one pipeline per event type running every reaction once. */
@Module({
  controllers: [NotificationsController],
  providers: [
    InAppReaction,
    { provide: NotificationsRepository, useClass: PrismaNotificationsRepository },
    PrismaProcessedEventStore,
    EventConsumerRunner,
    EventLogReaction,
    ContactsReaction,
    OrderSummaryReaction,
    EmailReaction,
    EmailRelayService,
    EmailRelayRunner,
    { provide: EventLogRepository, useClass: PrismaEventLogRepository },
    { provide: ContactsRepository, useClass: PrismaContactsRepository },
    { provide: OrderSummariesRepository, useClass: PrismaOrderSummariesRepository },
    { provide: EmailQueueRepository, useClass: PrismaEmailQueueRepository },
    { provide: EmailSender, useClass: SmtpEmailSender },
    { provide: EventReactions, useClass: AllEventReactions },
  ],
  exports: [ContactsRepository],
})
export class EventsModule {}
