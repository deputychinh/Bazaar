import { OutboxRelay } from '@bazaar/nest-common';
import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';

/** Starts publishing outbox rows once the application is up. */
@Injectable()
export class OutboxRelayRunner implements OnApplicationBootstrap {
  public constructor(private readonly relay: OutboxRelay) {}

  public onApplicationBootstrap(): void {
    this.relay.start();
  }
}
