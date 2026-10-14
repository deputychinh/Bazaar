import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { Injectable } from '@nestjs/common';

import { AppConfig } from '../../../config/app-config.js';
import type { EmailMessage } from '../../../interfaces/email.interface.js';

import { EmailSender } from './email-sender.js';

/** Amazon SES over its API; credentials come from the SDK chain (EKS Pod Identity), never keys. */
@Injectable()
export class SesEmailSender extends EmailSender {
  private readonly client: SESv2Client;

  public constructor(private readonly config: AppConfig) {
    super();
    const region = config.env.SES_REGION;
    this.client = new SESv2Client(region === undefined ? {} : { region });
  }

  public async send(message: EmailMessage): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.config.env.MAIL_FROM,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: message.text, Charset: 'UTF-8' },
              Html: { Data: message.html, Charset: 'UTF-8' },
            },
          },
        },
      }),
    );
  }
}
