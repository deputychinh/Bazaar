import { ProcessedEventStore } from '@bazaar/nest-common';

import { AppConfig } from '../../src/config/app-config.js';
import { notificationEnvSchema } from '../../src/config/env.schema.js';
import { EmailStatus } from '../../src/enums/email-status.enum.js';
import type { Contact } from '../../src/interfaces/contact.interface.js';
import type { EmailMessage, QueuedEmail } from '../../src/interfaces/email.interface.js';
import type { EventLogEntry } from '../../src/interfaces/event-log-entry.interface.js';
import type { OrderSummary } from '../../src/interfaces/order-summary.interface.js';
import type { Transaction } from '../../src/interfaces/transaction.interface.js';
import { ContactsRepository } from '../../src/modules/contacts/repositories/contacts.repository.js';
import { EmailQueueRepository } from '../../src/modules/emails/repositories/email-queue.repository.js';
import { EmailSender } from '../../src/modules/emails/senders/email-sender.js';
import { EventLogRepository } from '../../src/modules/event-log/repositories/event-log.repository.js';
import { OrderSummariesRepository } from '../../src/modules/order-summaries/repositories/order-summaries.repository.js';

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

export class InMemoryOrderSummariesRepository extends OrderSummariesRepository {
  public readonly rows = new Map<string, OrderSummary>();

  public save(summary: OrderSummary): Promise<void> {
    this.rows.set(summary.orderId, structuredClone(summary));
    return Promise.resolve();
  }

  public find(orderId: string): Promise<OrderSummary | null> {
    return Promise.resolve(this.rows.get(orderId) ?? null);
  }
}

export class InMemoryEmailQueueRepository extends EmailQueueRepository {
  public readonly rows: (QueuedEmail & { status: EmailStatus; lastError?: string })[] = [];

  public enqueue(message: EmailMessage): Promise<void> {
    this.rows.push({
      ...message,
      id: `mail-${this.rows.length + 1}`,
      attempts: 0,
      status: EmailStatus.Pending,
    });
    return Promise.resolve();
  }

  public pending(limit: number): Promise<QueuedEmail[]> {
    return Promise.resolve(
      this.rows.filter((row) => row.status === EmailStatus.Pending).slice(0, limit),
    );
  }

  public markSent(id: string): Promise<void> {
    const row = this.rows.find((candidate) => candidate.id === id);
    if (row !== undefined)
      Object.assign(row, { status: EmailStatus.Sent, attempts: row.attempts + 1 });
    return Promise.resolve();
  }

  public markAttemptFailed(id: string, error: string, isFinal: boolean): Promise<void> {
    const row = this.rows.find((candidate) => candidate.id === id);
    if (row !== undefined) {
      Object.assign(row, {
        attempts: row.attempts + 1,
        lastError: error,
        ...(isFinal && { status: EmailStatus.Failed }),
      });
    }
    return Promise.resolve();
  }
}

export class RecordingEmailSender extends EmailSender {
  public readonly sent: EmailMessage[] = [];
  public failNext = 0;

  public send(message: EmailMessage): Promise<void> {
    if (this.failNext > 0) {
      this.failNext -= 1;
      return Promise.reject(new Error('smtp down'));
    }
    this.sent.push(message);
    return Promise.resolve();
  }
}
