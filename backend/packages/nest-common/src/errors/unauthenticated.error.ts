import { ErrorCode } from '@bazaar/contracts';

import { DomainError } from './domain-error.js';

export class UnauthenticatedError extends DomainError {
  public readonly code = ErrorCode.Unauthenticated;
}
