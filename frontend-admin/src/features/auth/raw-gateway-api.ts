import type { paths as GatewayPaths } from '@/api/gateway.schema';
import { API_TIMEOUT_MS } from '@/constants/auth.constant';
import { createApiClient } from '@/utils/api-client.util';

/** Auth calls (login, refresh, logout) go without the 401 middleware, which uses them. */
export const rawGatewayApi = createApiClient<GatewayPaths>({
  baseUrl: window.location.origin,
  timeoutMs: API_TIMEOUT_MS,
});
