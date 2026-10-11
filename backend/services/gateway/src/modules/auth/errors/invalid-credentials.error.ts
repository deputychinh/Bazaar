import { ErrorCode } from '@bazaar/contracts';
import { DomainError } from '@bazaar/nest-common';

export class InvalidCredentialsError extends DomainError {
  public readonly code = ErrorCode.InvalidCredentials;
}
