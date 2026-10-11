import { type AnyEventEnvelope, EventType, type Locale } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../../config/app-config.js';
import { EmailKind } from '../../../enums/email-kind.enum.js';
import type { EmailContent } from '../../../interfaces/email.interface.js';
import type { EventReaction } from '../../../interfaces/event-reaction.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { OrderReferenceUtil } from '../../../utils/order-reference.util.js';
import { ContactsRepository } from '../../contacts/repositories/contacts.repository.js';
import { OrderSummariesRepository } from '../../order-summaries/repositories/order-summaries.repository.js';
import { EmailQueueRepository } from '../repositories/email-queue.repository.js';

import { EmailTemplates } from './email-templates.js';

/**
 * Decides who gets which email for an event and queues it in the recipient's language. Queuing
 * happens in the event's transaction, so each email is queued exactly once (the relay sends it).
 */
@Injectable()
export class EmailReaction implements EventReaction {
  public readonly name = 'emails';

  public constructor(
    private readonly contacts: ContactsRepository,
    private readonly summaries: OrderSummariesRepository,
    private readonly queue: EmailQueueRepository,
    private readonly config: AppConfig,
  ) {}

  public async react(event: AnyEventEnvelope, transaction: Transaction): Promise<void> {
    switch (event.type) {
      case EventType.EmailVerificationRequested:
      case EventType.PasswordResetRequested: {
        const { email, preferredLocale, link } = event.payload;
        const kind =
          event.type === EventType.EmailVerificationRequested
            ? EmailKind.VerifyEmail
            : EmailKind.ResetPassword;
        await this.queue.enqueue(
          EmailTemplates.render({ kind, locale: preferredLocale, link }, email),
          transaction,
        );
        return;
      }
      case EventType.OrderConfirmed: {
        const summary = await this.summaries.find(event.payload.orderId, transaction);
        await this.toUser(event.payload.shopperId, transaction, (locale) => ({
          kind: EmailKind.OrderConfirmed,
          locale,
          link: this.orderLink(locale, event.payload.orderId),
          orderReference: OrderReferenceUtil.of(event.payload.orderId),
          amountUsdCents: summary?.totalUsdCents,
          itemCount: summary?.sellers.reduce((sum, part) => sum + part.itemCount, 0),
        }));
        for (const part of summary?.sellers ?? []) {
          await this.toUser(part.sellerId, transaction, (locale) => ({
            kind: EmailKind.NewSellerOrder,
            locale,
            link: `${this.config.env.WEB_APP_URL}/${locale}/account`,
            orderReference: OrderReferenceUtil.of(event.payload.orderId),
            amountUsdCents: part.subtotalUsdCents,
            itemCount: part.itemCount,
          }));
        }
        return;
      }
      case EventType.OrderCancelled:
        await this.toUser(event.payload.shopperId, transaction, (locale) => ({
          kind: EmailKind.OrderCancelled,
          locale,
          link: this.orderLink(locale, event.payload.orderId),
          orderReference: OrderReferenceUtil.of(event.payload.orderId),
          cancelReason: event.payload.reason,
        }));
        return;
      case EventType.SellerOrderShipped:
      case EventType.SellerOrderDelivered: {
        const kind =
          event.type === EventType.SellerOrderShipped
            ? EmailKind.SellerOrderShipped
            : EmailKind.SellerOrderDelivered;
        await this.toUser(event.payload.shopperId, transaction, (locale) => ({
          kind,
          locale,
          link: this.orderLink(locale, event.payload.orderId),
          orderReference: OrderReferenceUtil.of(event.payload.orderId),
        }));
        return;
      }
      default:
    }
  }

  /** Users without a contact (never registered through events, not seeded) get no email. */
  private async toUser(
    userId: string,
    transaction: Transaction,
    content: (locale: Locale) => EmailContent,
  ): Promise<void> {
    const contact = await this.contacts.find(userId, transaction);
    if (contact === null) return;
    await this.queue.enqueue(
      EmailTemplates.render(content(contact.preferredLocale), contact.email),
      transaction,
    );
  }

  private orderLink(locale: Locale, orderId: string): string {
    return `${this.config.env.WEB_APP_URL}/${locale}/orders/${orderId}`;
  }
}
