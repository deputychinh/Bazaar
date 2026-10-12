import { API_TIMEOUT_MS } from '@/constants/api.constant';
import { createApiClient } from '@/utils/api-client.util';

import type { paths as GatewayPaths } from './gateway.schema';
import type { paths as NotificationPaths } from './notification.schema';
import type { paths as OrderPaths } from './order.schema';

/**
 * Browser calls go to this site's own origin; Next rewrites /api/v1/* to the gateway. Same-origin
 * keeps the refresh cookie first-party (SameSite=Strict, HttpOnly) and needs no CORS.
 */
const options = {
  baseUrl: typeof window === 'undefined' ? '' : window.location.origin,
  timeoutMs: API_TIMEOUT_MS,
};

export const browserGatewayApi = createApiClient<GatewayPaths>(options);
/** Order routes, proxied by the gateway (documented by backend/openapi/order.json). */
export const browserOrderApi = createApiClient<OrderPaths>(options);
/** In-app notifications, proxied by the gateway (backend/openapi/notification.json). */
export const browserNotificationApi = createApiClient<NotificationPaths>(options);
