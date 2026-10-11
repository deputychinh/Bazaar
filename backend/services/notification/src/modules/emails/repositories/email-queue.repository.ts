import type { EmailMessage, QueuedEmail } from '../../../interfaces/email.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

/** Port to the email queue (an outbox for SMTP). */
export abstract class EmailQueueRepository {
  public abstract enqueue(message: EmailMessage, transaction: Transaction): Promise<void>;

  public abstract pending(limit: number): Promise<QueuedEmail[]>;

  public abstract markSent(id: string, at: Date): Promise<void>;

  /** Counts the attempt; FAILED once it reaches the limit. */
  public abstract markAttemptFailed(id: string, error: string, isFinal: boolean): Promise<void>;
}
