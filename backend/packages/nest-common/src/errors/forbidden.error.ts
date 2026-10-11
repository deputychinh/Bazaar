import { ErrorCode } from '@bazaar/contracts';

import { DomainError } from './domain-error.js';

export class ForbiddenError extends DomainError {
  public readonly code = ErrorCode.Forbidden;
}
