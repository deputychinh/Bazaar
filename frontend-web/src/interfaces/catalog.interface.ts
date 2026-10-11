import type { paths } from '@/api/catalog.schema';
import type { paths as GatewayPaths } from '@/api/gateway.schema';

/** Shapes taken from the generated contracts — never written by hand (plan DS-01). */
export type ProductPage =
  paths['/api/v1/products']['get']['responses'][200]['content']['application/json'];
export type ProductSummary = ProductPage['items'][number];
export type FxRates =
  GatewayPaths['/api/v1/fx-rates']['get']['responses'][200]['content']['application/json'];
