import { FixedClock, InMemoryDistributedLock } from '@bazaar/nest-common';
import type { PinoLogger } from 'nestjs-pino';

import {
  InMemoryEmailQueueRepository,
  NOW,
  RecordingEmailSender,
} from '../../../../test/fakes/notification.fakes.js';
import { EmailStatus } from '../../../enums/email-status.enum.js';

import { EmailRelayService } from './email-relay.service.js';

const logger = { setContext: vi.fn(), warn: vi.fn() } as unknown as PinoLogger;
const mail = (to: string) => ({ to, subject: 's', text: 't', html: '<p>t</p>' });

describe('EmailRelayService', () => {
  it('sends queued emails once and retries failures up to the limit', async () => {
    const queue = new InMemoryEmailQueueRepository();
    const sender = new RecordingEmailSender();
    const relay = new EmailRelayService(
      queue,
      sender,
      new InMemoryDistributedLock(),
      new FixedClock(NOW),
      logger,
    );
    await queue.enqueue(mail('a@b.test'));
    await queue.enqueue(mail('c@d.test'));
    sender.failNext = 1;

    await relay.relay();
    expect(sender.sent.map((message) => message.to)).toEqual(['c@d.test']);
    expect(queue.rows[0]).toMatchObject({
      status: EmailStatus.Pending,
      attempts: 1,
      lastError: 'smtp down',
    });

    await relay.relay();
    expect(sender.sent.map((message) => message.to)).toEqual(['c@d.test', 'a@b.test']);
    await relay.relay();
    expect(sender.sent).toHaveLength(2);
  });

  it('gives up after five failed attempts', async () => {
    const queue = new InMemoryEmailQueueRepository();
    const sender = new RecordingEmailSender();
    const relay = new EmailRelayService(
      queue,
      sender,
      new InMemoryDistributedLock(),
      new FixedClock(NOW),
      logger,
    );
    await queue.enqueue(mail('a@b.test'));
    sender.failNext = 10;

    for (let attempt = 0; attempt < 6; attempt += 1) await relay.relay();

    expect(queue.rows[0]).toMatchObject({ status: EmailStatus.Failed, attempts: 5 });
  });
});
