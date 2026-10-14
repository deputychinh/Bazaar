import { orderApi } from '@/api/client';
import type { PlatformStats, SellerStats } from '@/interfaces/stats.interface';
import { apiFailure } from '@/utils/api-error.util';

export const sellerStats = async (days: number): Promise<SellerStats> => {
  const { data, error } = await orderApi.GET('/api/v1/seller/stats', {
    params: { query: { days } },
  });
  if (data === undefined) throw apiFailure(error.code);
  return data;
};

export const platformStats = async (days: number): Promise<PlatformStats> => {
  const { data, error } = await orderApi.GET('/api/v1/admin/stats', {
    params: { query: { days } },
  });
  if (data === undefined) throw apiFailure(error.code);
  return data;
};
