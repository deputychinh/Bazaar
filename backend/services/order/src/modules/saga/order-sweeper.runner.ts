import { PromiseUtil } from '@bazaar/nest-common';
import {
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { AppConfig } from '../../config/app-config.js';

import { OrderSweeperService } from './services/order-sweeper.service.js';

/** Runs the sweep on a fixed interval while the app is up. */
@Injectable()
export class OrderSweeperRunner implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | undefined;

  public constructor(
    private readonly sweeper: OrderSweeperService,
    private readonly config: AppConfig,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OrderSweeperRunner.name);
  }

  public onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      this.sweeper.sweep().catch((error: unknown) => {
        this.logger.error({ reason: PromiseUtil.errorMessage(error) }, 'order sweep failed');
      });
    }, this.config.env.ORDER_SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  public onApplicationShutdown(): void {
    clearInterval(this.timer);
  }
}
