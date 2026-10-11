import type { Card } from '@bazaar/contracts';

import type {
  ChargeRequest,
  ChargeResult,
  TokenizedCard,
} from '../../../interfaces/payment.interface.js';

/**
 * Port to a payment provider (Strategy). Checkout tokenises the card at once; the saga charges the
 * token later, after stock is reserved. Swapping in a real provider touches only an adapter.
 */
export abstract class PaymentProvider {
  /** Throws ValidationError for a number the provider cannot accept. */
  public abstract tokenize(card: Card): Promise<TokenizedCard>;

  public abstract charge(request: ChargeRequest): Promise<ChargeResult>;
}
