import type { paths as CatalogPaths } from '@/api/catalog.schema';
import type { operations as GatewayOperations, paths as GatewayPaths } from '@/api/gateway.schema';
import type {
  operations as NotificationOperations,
  paths as NotificationPaths,
} from '@/api/notification.schema';

/** Shapes taken from the generated contracts — never written by hand (plan DS-01). */
export type ApplicationPage =
  GatewayPaths['/api/v1/admin/seller-applications']['get']['responses'][200]['content']['application/json'];
export type Application = ApplicationPage['items'][number];
export type ApplicationsQuery = NonNullable<
  GatewayOperations['AdminSellerApplicationsController_list']['parameters']['query']
>;
export type ModerationPage =
  CatalogPaths['/api/v1/admin/products']['get']['responses'][200]['content']['application/json'];
export type ModerationQuery = NonNullable<
  CatalogPaths['/api/v1/admin/products']['get']['parameters']['query']
>;
export type EventLogPage =
  NotificationPaths['/api/v1/admin/events']['get']['responses'][200]['content']['application/json'];
export type EventsQuery = NonNullable<
  NotificationOperations['AdminEventsController_search']['parameters']['query']
>;
