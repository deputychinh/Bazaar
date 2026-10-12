import { UserRole } from '@bazaar/contracts';
import {
  type AuthenticatedUser,
  EnumUtil,
  ProcessedEventStore,
  TokenVerifier,
  UnauthenticatedError,
} from '@bazaar/nest-common';

import { AppConfig } from '../../src/config/app-config.js';
import { notificationEnvSchema } from '../../src/config/env.schema.js';
import { EmailStatus } from '../../src/enums/email-status.enum.js';
import type { Contact } from '../../src/interfaces/contact.interface.js';
import type { EmailMessage, QueuedEmail } from '../../src/interfaces/email.interface.js';
import type { EventLogEntry } from '../../src/interfaces/event-log-entry.interface.js';
import type {
  NewNotification,
  Notification,
  NotificationPage,
} from '../../src/interfaces/notification.interface.js';
import type { OrderSummary } from '../../src/interfaces/order-summary.interface.js';
import type { Transaction } from '../../src/interfaces/transaction.interface.js';
import { ContactsRepository } from '../../src/modules/contacts/repositories/contacts.repository.js';
import { EmailQueueRepository } from '../../src/modules/emails/repositories/email-queue.repository.js';
import { EmailSender } from '../../src/modules/emails/senders/email-sender.js';
import { EventLogRepository } from '../../src/modules/event-log/repositories/event-log.repository.js';
import { NotificationsRepository } from '../../src/modules/in-app/repositories/notifications.repository.js';
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

export const TEST_INTERNAL_KEY = 'internal-test-key-0123456789abcdef';

/** Tokens in tests read "ROLE:userId", e.g. "SHOPPER:shopper-1". */
export class FakeTokenVerifier extends TokenVerifier {
  public verify(token: string): Promise<AuthenticatedUser> {
    const [role, id] = token.split(':');
    if (role === undefined || id === undefined) {
      return Promise.reject(new UnauthenticatedError('bad test token'));
    }
    return Promise.resolve({
      id,
      email: `${id}@bazaar.test`,
      role: EnumUtil.parse(UserRole, role),
    });
  }
}

export const bearer = (role: UserRole, id: string): string => `Bearer ${role}:${id}`;

export class InMemoryNotificationsRepository extends NotificationsRepository {
  public readonly rows: Notification[] = [];

  public create(notification: NewNotification): Promise<void> {
    this.rows.push({
      ...structuredClone(notification),
      id: `aaaaaaaaaaaaaaaaaaaaaa${String(this.rows.length).padStart(2, '0')}`,
      readAt: null,
      createdAt: new Date(NOW.getTime() + this.rows.length * 1000),
    });
    return Promise.resolve();
  }

  public page(userId: string, page: { page: number; pageSize: number }): Promise<NotificationPage> {
    const mine = this.rows.filter((row) => row.userId === userId).reverse();
    const start = (page.page - 1) * page.pageSize;
    return Promise.resolve({
      items: mine.slice(start, start + page.pageSize),
      total: mine.length,
      unread: mine.filter((row) => row.readAt === null).length,
    });
  }

  public markRead(userId: string, id: string, at: Date): Promise<boolean> {
    const row = this.rows.find((candidate) => candidate.id === id && candidate.userId === userId);
    if (row === undefined) return Promise.resolve(false);
    row.readAt = at;
    return Promise.resolve(true);
  }

  public markAllRead(userId: string, at: Date): Promise<void> {
    this.rows
      .filter((row) => row.userId === userId && row.readAt === null)
      .forEach((row) => (row.readAt = at));
    return Promise.resolve();
  }
}
