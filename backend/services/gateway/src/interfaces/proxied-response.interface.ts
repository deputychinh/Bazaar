export interface ProxiedRequest {
  method: string;
  /** Path and query after the gateway prefix, e.g. /api/v1/products?page=2 */
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

export interface ProxiedResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}
