import { ErrorCode } from '@bazaar/contracts';

import { DomainError } from './domain-error.js';

export class NotFoundError extends DomainError {
  public readonly code = ErrorCode.NotFound;

  public constructor(resource: string, id: string) {
    super(`${resource} ${id} was not found`, { resource, id });
  }
}
