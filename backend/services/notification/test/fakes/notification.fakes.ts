import { ProcessedEventStore } from '@bazaar/nest-common';

import { AppConfig } from '../../src/config/app-config.js';
import { notificationEnvSchema } from '../../src/config/env.schema.js';
import type { Contact } from '../../src/interfaces/contact.interface.js';
import type { EventLogEntry } from '../../src/interfaces/event-log-entry.interface.js';
import type { Transaction } from '../../src/interfaces/transaction.interface.js';
import { ContactsRepository } from '../../src/modules/contacts/repositories/contacts.repository.js';
import { EventLogRepository } from '../../src/modules/event-log/repositories/event-log.repository.js';

export const NOW = new Date('2026-10-11T08:00:00.000Z');
export const NO_TRANSACTION = {} as Transaction;

export const testConfig = (): AppConfig =>
  new AppConfig(
    notificationEnvSchema.parse({
      NOTIFICATION_DATABASE_URL: 'mongodb://test',
      REDIS_URL: 'redis://test',
      KAFKA_BROKERS: 'localhost:9094',
    }),
  );

/** Runs work once per event id, like the Mongo store. */
export class OnceProcessedEventStore extends ProcessedEventStore<Transaction> {
  public readonly seen = new Set<string>();

  public async runOnce(
    eventId: string,
    work: (transaction: Transaction) => Promise<void>,
  ): Promise<boolean> {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    await work(NO_TRANSACTION);
    return true;
  }
}

export class InMemoryContactsRepository extends ContactsRepository {
  public readonly rows = new Map<string, Contact>();

  public save(contact: Contact): Promise<void> {
    this.rows.set(contact.userId, { ...contact });
    return Promise.resolve();
  }

  public find(userId: string): Promise<Contact | null> {
    return Promise.resolve(this.rows.get(userId) ?? null);
  }
}

export class InMemoryEventLogRepository extends EventLogRepository {
  public readonly entries: EventLogEntry[] = [];

  public append(entry: EventLogEntry): Promise<void> {
    this.entries.push(entry);
    return Promise.resolve();
  }
}
