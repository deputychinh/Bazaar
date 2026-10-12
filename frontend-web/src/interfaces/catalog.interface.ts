import type { components, operations, paths } from '@/api/catalog.schema';
import type { paths as GatewayPaths } from '@/api/gateway.schema';

/** Shapes taken from the generated contracts — never written by hand (plan DS-01). */
export type ProductPage =
  paths['/api/v1/products']['get']['responses'][200]['content']['application/json'];
export type ProductSummary = ProductPage['items'][number];
export type FxRates =
  GatewayPaths['/api/v1/fx-rates']['get']['responses'][200]['content']['application/json'];
export type Category = components['schemas']['CategoryResponse'];
/** Filters, sort and page of a catalog listing, as read from the URL. */
export type CatalogQuery = NonNullable<
  operations['ProductsController_list']['parameters']['query']
>;
export type ProductDetail =
  paths['/api/v1/products/{slug}']['get']['responses'][200]['content']['application/json'];
export type ProductVariant = ProductDetail['variants'][number];
export type ProductImage = ProductDetail['images'][number];
export type Shop =
  paths['/api/v1/shops/{slug}']['get']['responses'][200]['content']['application/json'];
export type ReviewView = components['schemas']['Review'];
export type ReviewPage = components['schemas']['ReviewPage'];
export type ReviewEligibility = components['schemas']['ReviewEligibility'];
