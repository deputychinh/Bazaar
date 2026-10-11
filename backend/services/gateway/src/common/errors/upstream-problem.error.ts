import type { ErrorCode, ProblemDetails } from '@bazaar/contracts';
import { DomainError } from '@bazaar/nest-common';

/** A problem answered by an internal service, passed on to the client unchanged (code + details). */
export class UpstreamProblemError extends DomainError {
  public readonly code: ErrorCode;

  public constructor(problem: ProblemDetails) {
    super(problem.message, problem.details);
    this.code = problem.code;
  }
}
