export const GATEWAY_SERVICE_NAME = 'gateway';
export const GATEWAY_DEFAULT_PORT = 4000;
export const API_PREFIX = 'api/v1';
export const API_DOCS_PATH = 'api/docs';
export const UPSTREAM_TIMEOUT_MS = 10_000;
/** Request headers passed to internal services; everything else stays at the edge. */
export const FORWARDED_REQUEST_HEADERS = [
  'authorization',
  'content-type',
  'accept',
  'accept-language',
  'x-request-id',
];
export const FORWARDED_RESPONSE_HEADERS = [
  'content-type',
  'ratelimit-limit',
  'ratelimit-remaining',
  'cache-control',
];
/** Paths the gateway forwards to the catalog service (plan §3, BZ-029). */
export const CATALOG_ROUTES = [
  'products',
  'products/*path',
  'categories',
  'shops/*path',
  'seller/shop',
  'seller/products',
  'seller/products/*path',
  'admin/products/*path',
];
