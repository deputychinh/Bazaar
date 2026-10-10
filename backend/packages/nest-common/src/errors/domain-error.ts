import type { ErrorCode } from '@bazaar/contracts';

/** Base of every business error; translated to HTTP once, by ProblemDetailsFilter. */
export abstract class DomainError extends Error {
  public abstract readonly code: ErrorCode;

  public constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
