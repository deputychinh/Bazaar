import { Clock, DistributedLock, PromiseUtil } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import {
  EMAIL_RELAY_BATCH_SIZE,
  EMAIL_RELAY_LOCK_KEY,
  EMAIL_RELAY_LOCK_TTL_MS,
  MAX_EMAIL_ATTEMPTS,
} from '../../../constants/email.constant.js';
import { EmailQueueRepository } from '../repositories/email-queue.repository.js';
import { EmailSender } from '../senders/email-sender.js';

/** Sends queued emails on one pod at a time; a failed send is retried up to MAX_EMAIL_ATTEMPTS. */
@Injectable()
export class EmailRelayService {
  public constructor(
    private readonly queue: EmailQueueRepository,
    private readonly sender: EmailSender,
    private readonly lock: DistributedLock,
    private readonly clock: Clock,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmailRelayService.name);
  }

  public relay(): Promise<boolean> {
    return this.lock.runExclusive(EMAIL_RELAY_LOCK_KEY, EMAIL_RELAY_LOCK_TTL_MS, async () => {
      for (const email of await this.queue.pending(EMAIL_RELAY_BATCH_SIZE)) {
        try {
          await this.sender.send(email);
          await this.queue.markSent(email.id, this.clock.now());
        } catch (error) {
          const reason = PromiseUtil.errorMessage(error);
          const isFinal = email.attempts + 1 >= MAX_EMAIL_ATTEMPTS;
          this.logger.warn({ emailId: email.id, reason, isFinal }, 'email not sent');
          await this.queue.markAttemptFailed(email.id, reason, isFinal);
        }
      }
    });
  }
}
