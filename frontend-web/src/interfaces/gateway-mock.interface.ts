/** A canned gateway answer for component tests, keyed "POST /api/v1/auth/login". */
export interface MockResponse {
  status: number;
  body?: unknown;
}

export type GatewayRoutes = Record<string, MockResponse | ((request: Request) => MockResponse)>;
