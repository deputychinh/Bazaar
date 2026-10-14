import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { STATS_DAYS } from '@/constants/stats.constant';
import type { PlatformStats, SellerStats } from '@/interfaces/stats.interface';

import { platformStats, sellerStats } from '../services/stats.service';

export const useSellerStats = (): UseQueryResult<SellerStats> =>
  useQuery({ queryKey: ['stats', 'seller', STATS_DAYS], queryFn: () => sellerStats(STATS_DAYS) });

export const usePlatformStats = (): UseQueryResult<PlatformStats> =>
  useQuery({
    queryKey: ['stats', 'platform', STATS_DAYS],
    queryFn: () => platformStats(STATS_DAYS),
  });
