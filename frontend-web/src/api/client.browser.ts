import { API_TIMEOUT_MS } from '@/constants/api.constant';
import { createApiClient } from '@/utils/api-client.util';

import type { paths as GatewayPaths } from './gateway.schema';

/**
 * Browser calls go to this site's own origin; Next rewrites /api/v1/* to the gateway. Same-origin
 * keeps the refresh cookie first-party (SameSite=Strict, HttpOnly) and needs no CORS.
 */
export const browserGatewayApi = createApiClient<GatewayPaths>({
  baseUrl: typeof window === 'undefined' ? '' : window.location.origin,
  timeoutMs: API_TIMEOUT_MS,
});
