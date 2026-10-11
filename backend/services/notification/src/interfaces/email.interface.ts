import type { CancelReason, Locale } from '@bazaar/contracts';

import type { EmailKind } from '../enums/email-kind.enum.js';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface QueuedEmail extends EmailMessage {
  id: string;
  attempts: number;
}

/** What a template may show; every field is optional except what its kind needs. */
export interface EmailContent {
  kind: EmailKind;
  locale: Locale;
  /** One-time link (verify / reset) or the order page. */
  link: string;
  orderReference?: string;
  amountUsdCents?: number;
  itemCount?: number;
  cancelReason?: CancelReason;
}

/** Text of one email in one language; `{ref}`, `{amount}`, `{count}`, `{reason}` are filled in. */
export interface EmailCopy {
  subject: string;
  body: string;
  action: string;
}
