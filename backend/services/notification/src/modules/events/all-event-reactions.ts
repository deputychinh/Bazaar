import { Injectable } from '@nestjs/common';

import type { EventReaction } from '../../interfaces/event-reaction.interface.js';
import { ContactsReaction } from '../contacts/services/contacts.reaction.js';
import { EmailReaction } from '../emails/services/email.reaction.js';
import { EventLogReaction } from '../event-log/services/event-log.reaction.js';
import { InAppReaction } from '../in-app/services/in-app.reaction.js';
import { OrderSummaryReaction } from '../order-summaries/services/order-summary.reaction.js';

import { EventReactions } from './event-reactions.js';

/** The reactions in running order: contacts and summaries are stored before emails read them. */
@Injectable()
export class AllEventReactions extends EventReactions {
  public readonly all: readonly EventReaction[];

  public constructor(
    log: EventLogReaction,
    contacts: ContactsReaction,
    summaries: OrderSummaryReaction,
    emails: EmailReaction,
    inApp: InAppReaction,
  ) {
    super();
    this.all = [log, contacts, summaries, emails, inApp];
  }
}
