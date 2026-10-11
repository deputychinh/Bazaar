import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import { AppConfig } from '../../../config/app-config.js';
import type { EmailMessage } from '../../../interfaces/email.interface.js';

import { EmailSender } from './email-sender.js';

/** Plain SMTP: Mailpit catches everything locally (http://localhost:8026). */
@Injectable()
export class SmtpEmailSender extends EmailSender implements OnModuleDestroy {
  private readonly transport: Transporter;

  public constructor(private readonly config: AppConfig) {
    super();
    this.transport = createTransport({
      host: config.env.SMTP_HOST,
      port: config.env.SMTP_PORT,
      secure: false,
    });
  }

  public async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.config.env.MAIL_FROM, ...message });
  }

  public onModuleDestroy(): void {
    this.transport.close();
  }
}
