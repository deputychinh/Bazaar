/** One JSON POST to an internal service route. */
export interface InternalCall {
  baseUrl: string;
  path: string;
  payload: unknown;
  headers?: Record<string, string>;
}
