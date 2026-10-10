import { ErrorCode } from '@bazaar/contracts';

import { DomainError } from './domain-error.js';

export class ValidationError extends DomainError {
  public readonly code = ErrorCode.ValidationFailed;
}
