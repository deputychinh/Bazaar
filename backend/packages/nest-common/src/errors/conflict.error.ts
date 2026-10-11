import { ErrorCode } from '@bazaar/contracts';

import { DomainError } from './domain-error.js';

export class ConflictError extends DomainError {
  public readonly code = ErrorCode.Conflict;
}
