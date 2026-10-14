import { orderApi } from '@/api/client';
import type {
  SellerOrderPage,
  SellerOrdersQuery,
  SellerOrderView,
} from '@/interfaces/order.interface';
import { apiFailure } from '@/utils/api-error.util';

const unwrap = <T>(result: { data?: T; error?: { code: string; details?: unknown } }): T => {
  if (result.data !== undefined) return result.data;
  throw apiFailure(result.error?.code ?? 'INTERNAL', result.error?.details);
};

export const listSellerOrders = async (query: SellerOrdersQuery): Promise<SellerOrderPage> =>
  unwrap(await orderApi.GET('/api/v1/seller/orders', { params: { query } }));

export const shipSellerOrder = async (id: string): Promise<SellerOrderView> =>
  unwrap(await orderApi.POST('/api/v1/seller/orders/{id}/ship', { params: { path: { id } } }));

export const deliverSellerOrder = async (id: string): Promise<SellerOrderView> =>
  unwrap(await orderApi.POST('/api/v1/seller/orders/{id}/deliver', { params: { path: { id } } }));
