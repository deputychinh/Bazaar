import { PromiseUtil } from '@bazaar/nest-common';
import {
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { AppConfig } from '../../config/app-config.js';

import { EmailRelayService } from './services/email-relay.service.js';

/** Runs the email relay on a fixed interval while the app is up. */
@Injectable()
export class EmailRelayRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | undefined;

  public constructor(
    private readonly relay: EmailRelayService,
    private readonly config: AppConfig,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmailRelayRunner.name);
  }

  public onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      this.relay.relay().catch((error: unknown) => {
        this.logger.error({ reason: PromiseUtil.errorMessage(error) }, 'email relay failed');
      });
    }, this.config.env.EMAIL_RELAY_INTERVAL_MS);
    this.timer.unref();
  }

  public onApplicationShutdown(): void {
    clearInterval(this.timer);
  }
}
