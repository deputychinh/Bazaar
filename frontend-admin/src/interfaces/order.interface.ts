import type { operations, paths } from '@/api/order.schema';

/** Shapes taken from the generated contracts — never written by hand (plan DS-01). */
export type SellerOrderPage =
  paths['/api/v1/seller/orders']['get']['responses'][200]['content']['application/json'];
export type SellerOrderView = SellerOrderPage['items'][number];
export type SellerOrdersQuery = NonNullable<
  operations['SellerOrdersController_list']['parameters']['query']
>;
