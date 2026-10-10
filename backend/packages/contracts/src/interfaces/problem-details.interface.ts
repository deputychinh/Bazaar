import type { ErrorCode } from '../enums/error-code.enum.js';

/** Error body returned by every HTTP endpoint. Frontends translate `code`. */
export interface ProblemDetails {
  code: ErrorCode;
  message: string;
  status: number;
  details?: Record<string, unknown>;
  traceId?: string;
}
