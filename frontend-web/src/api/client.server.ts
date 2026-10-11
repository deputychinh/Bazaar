import 'server-only';

import { serverEnv } from '@/config/env.server';
import { API_TIMEOUT_MS } from '@/constants/api.constant';
import { createApiClient } from '@/utils/api-client.util';

import type { paths as CatalogPaths } from './catalog.schema';
import type { paths as GatewayPaths } from './gateway.schema';

// The gateway serves both: its own routes and the catalog routes it proxies.
const options = { baseUrl: serverEnv.API_BASE_URL, timeoutMs: API_TIMEOUT_MS };

export const gatewayApi = createApiClient<GatewayPaths>(options);
export const catalogApi = createApiClient<CatalogPaths>(options);
