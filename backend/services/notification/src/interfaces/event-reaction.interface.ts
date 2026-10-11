import type { AnyEventEnvelope } from '@bazaar/contracts';

import type { Transaction } from './transaction.interface.js';

/** One thing the notification service does with an event, inside its idempotency transaction. */
export interface EventReaction {
  readonly name: string;
  react(event: AnyEventEnvelope, transaction: Transaction): Promise<void>;
}
