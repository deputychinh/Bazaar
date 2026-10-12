import { API_TIMEOUT_MS } from '@/constants/auth.constant';
import { createApiClient } from '@/utils/api-client.util';

import { authMiddleware } from './auth-middleware';
import type { paths as CatalogPaths } from './catalog.schema';
import type { paths as GatewayPaths } from './gateway.schema';
import type { paths as NotificationPaths } from './notification.schema';
import type { paths as OrderPaths } from './order.schema';

// Every service is reached through the gateway on this origin (/api is proxied).
const options = { baseUrl: window.location.origin, timeoutMs: API_TIMEOUT_MS };

export const gatewayApi = createApiClient<GatewayPaths>(options);
export const catalogApi = createApiClient<CatalogPaths>(options);
export const orderApi = createApiClient<OrderPaths>(options);
export const notificationApi = createApiClient<NotificationPaths>(options);

[gatewayApi, catalogApi, orderApi, notificationApi].forEach((client) => client.use(authMiddleware));
