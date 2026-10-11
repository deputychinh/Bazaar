import { ErrorCode } from '@bazaar/contracts';
import { DomainError } from '@bazaar/nest-common';

export class RateLimitedError extends DomainError {
  public readonly code = ErrorCode.RateLimited;
}
