import type { ErrorCode } from '@/api/gateway.schema';

/** Either the data, or the API error code to translate (ADR 0012). */
export type ApiResult<T> = { data: T; errorCode: null } | { data: null; errorCode: ErrorCode };

/** What an openapi-fetch call resolves to: data on success, problem details otherwise. */
export interface ApiOutcome<T> {
  data?: T;
  error?: { code: ErrorCode };
}
