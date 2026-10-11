import { ErrorCode } from '@bazaar/contracts';
import { DomainError } from '@bazaar/nest-common';

export class InvalidOrderTransitionError extends DomainError {
  public readonly code = ErrorCode.InvalidOrderTransition;
}
