import { ErrorCode } from '@bazaar/contracts';
import { DomainError } from '@bazaar/nest-common';

export class AccountSuspendedError extends DomainError {
  public readonly code = ErrorCode.AccountSuspended;
}
