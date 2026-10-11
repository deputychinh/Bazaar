import 'server-only';

import { gatewayApi } from './client.server';

/** VND per USD for display, or null when the gateway cannot be reached (prices stay in USD). */
export const getUsdToVnd = async (): Promise<number | null> => {
  try {
    const { data } = await gatewayApi.GET('/api/v1/fx-rates');
    return data?.rates.VND ?? null;
  } catch {
    return null;
  }
};
