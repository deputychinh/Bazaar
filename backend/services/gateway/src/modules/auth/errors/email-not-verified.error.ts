import { ErrorCode } from '@bazaar/contracts';
import { DomainError } from '@bazaar/nest-common';

export class EmailNotVerifiedError extends DomainError {
  public readonly code = ErrorCode.EmailNotVerified;
}
