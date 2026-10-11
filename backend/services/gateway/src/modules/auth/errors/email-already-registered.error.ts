import { ErrorCode } from '@bazaar/contracts';
import { DomainError } from '@bazaar/nest-common';

export class EmailAlreadyRegisteredError extends DomainError {
  public readonly code = ErrorCode.EmailAlreadyRegistered;
}
