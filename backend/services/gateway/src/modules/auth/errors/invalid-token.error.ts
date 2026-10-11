import { ErrorCode } from '@bazaar/contracts';
import { DomainError } from '@bazaar/nest-common';

export class InvalidTokenError extends DomainError {
  public readonly code = ErrorCode.InvalidToken;
}
