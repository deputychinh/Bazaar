import { ProcessedEventStore } from '@bazaar/nest-common';

/**
 * Live pushes need no idempotency: a duplicate only makes the browser reload an order twice.
 * Runs the work directly, without a database.
 */
export class PassThroughEventStore extends ProcessedEventStore<undefined> {
  public async runOnce(
    _eventId: string,
    work: (transaction: undefined) => Promise<void>,
  ): Promise<boolean> {
    await work(undefined);
    return true;
  }
}
