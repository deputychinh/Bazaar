import { type AnyEventEnvelope, EventType } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import type { EventReaction } from '../../../interfaces/event-reaction.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { ContactsRepository } from '../repositories/contacts.repository.js';

/** Keeps each user's email and language from identity events (the service's contact book). */
@Injectable()
export class ContactsReaction implements EventReaction {
  public readonly name = 'contacts';

  public constructor(private readonly contacts: ContactsRepository) {}

  public async react(event: AnyEventEnvelope, transaction: Transaction): Promise<void> {
    if (
      event.type !== EventType.UserRegistered &&
      event.type !== EventType.EmailVerificationRequested &&
      event.type !== EventType.PasswordResetRequested
    ) {
      return;
    }
    const { userId, email, preferredLocale } = event.payload;
    await this.contacts.save({ userId, email, preferredLocale }, transaction);
  }
}
