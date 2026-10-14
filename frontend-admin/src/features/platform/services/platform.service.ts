import { catalogApi, gatewayApi, notificationApi } from '@/api/client';
import type {
  Application,
  ApplicationPage,
  ApplicationsQuery,
  EventLogPage,
  EventsQuery,
  ModerationPage,
  ModerationQuery,
} from '@/interfaces/platform.interface';
import type { SellerProduct } from '@/interfaces/product.interface';
import { apiFailure } from '@/utils/api-error.util';

const unwrap = <T>(result: { data?: T; error?: { code: string; details?: unknown } }): T => {
  if (result.data !== undefined) return result.data;
  throw apiFailure(result.error?.code ?? 'INTERNAL', result.error?.details);
};

export const listApplications = async (query: ApplicationsQuery): Promise<ApplicationPage> =>
  unwrap(await gatewayApi.GET('/api/v1/admin/seller-applications', { params: { query } }));

export const approveApplication = async (id: string): Promise<Application> =>
  unwrap(
    await gatewayApi.POST('/api/v1/admin/seller-applications/{id}/approve', {
      params: { path: { id } },
    }),
  );

export const rejectApplication = async (id: string, reason: string): Promise<Application> =>
  unwrap(
    await gatewayApi.POST('/api/v1/admin/seller-applications/{id}/reject', {
      params: { path: { id } },
      body: { reason },
    }),
  );

export const listForModeration = async (query: ModerationQuery): Promise<ModerationPage> =>
  unwrap(await catalogApi.GET('/api/v1/admin/products', { params: { query } }));

export const hideProduct = async (id: string, reason: string): Promise<SellerProduct> =>
  unwrap(
    await catalogApi.POST('/api/v1/admin/products/{id}/hide', {
      params: { path: { id } },
      body: { reason },
    }),
  );

export const restoreProduct = async (id: string): Promise<SellerProduct> =>
  unwrap(
    await catalogApi.POST('/api/v1/admin/products/{id}/restore', { params: { path: { id } } }),
  );

export const searchEvents = async (query: EventsQuery): Promise<EventLogPage> =>
  unwrap(await notificationApi.GET('/api/v1/admin/events', { params: { query } }));
