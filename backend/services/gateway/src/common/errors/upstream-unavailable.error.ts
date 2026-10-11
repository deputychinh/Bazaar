import { ErrorCode } from '@bazaar/contracts';
import { DomainError } from '@bazaar/nest-common';

export class UpstreamUnavailableError extends DomainError {
  public readonly code = ErrorCode.UpstreamUnavailable;
}
