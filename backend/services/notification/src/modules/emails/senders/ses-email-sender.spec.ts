import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';

import { AppConfig } from '../../../config/app-config.js';
import { notificationEnvSchema } from '../../../config/env.schema.js';
import { MailTransport } from '../../../enums/mail-transport.enum.js';

import { SesEmailSender } from './ses-email-sender.js';

describe('SesEmailSender', () => {
  it('sends one simple UTF-8 email from MAIL_FROM through the SES API', async () => {
    const send = vi.spyOn(SESv2Client.prototype, 'send').mockResolvedValue({} as never);
    const env = notificationEnvSchema.parse({
      NOTIFICATION_DATABASE_URL:
        'mongodb+srv://cluster-pl-0.example.mongodb.net/bazaar_notification',
      REDIS_URL: 'rediss://cache.example:6379',
      KAFKA_BROKERS: 'b-1.msk.example:9096',
      MAIL_TRANSPORT: 'ses',
      SES_REGION: 'ap-southeast-1',
    });
    expect(env.MAIL_TRANSPORT).toBe(MailTransport.Ses);

    await new SesEmailSender(new AppConfig(env)).send({
      to: 'linh@bazaar.test',
      subject: 'Đơn hàng #1',
      text: 'Cảm ơn',
      html: '<p>Cảm ơn</p>',
    });

    const command = send.mock.calls[0]?.[0] as SendEmailCommand;
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input).toMatchObject({
      FromEmailAddress: env.MAIL_FROM,
      Destination: { ToAddresses: ['linh@bazaar.test'] },
      Content: { Simple: { Subject: { Data: 'Đơn hàng #1', Charset: 'UTF-8' } } },
    });
    send.mockRestore();
  });
});
