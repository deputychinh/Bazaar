import type { EmailMessage } from '../../../interfaces/email.interface.js';

/** Port to the mail server (Mailpit locally, Amazon SES in production). */
export abstract class EmailSender {
  public abstract send(message: EmailMessage): Promise<void>;
}
