/** A canned gateway answer for component tests, keyed "POST /api/v1/auth/login". */
export interface MockResponse {
  status: number;
  body?: unknown;
  /** Raw text body instead of JSON, e.g. a server-sent event stream. */
  text?: string;
  contentType?: string;
}

export type GatewayRoutes = Record<string, MockResponse | ((request: Request) => MockResponse)>;
