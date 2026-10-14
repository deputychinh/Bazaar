/** A problem-details answer as an Error, so TanStack Query treats it as a failure. */
export interface ApiFailure extends Error {
  code: string;
  details?: unknown;
}
