import { ErrorCode } from '@bazaar/contracts';
import { DomainError } from '@bazaar/nest-common';

/** Checkout stopped: some cart lines can no longer be bought as they are (details.lines says why). */
export class CartChangedError extends DomainError {
  public readonly code = ErrorCode.CartChanged;
}
