import { orderStatusSchema } from '@bazaar/contracts';
import { z } from 'zod';

import { DEFAULT_STATS_DAYS, MAX_STATS_DAYS } from '../../../constants/stats.constant.js';

export const statsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(MAX_STATS_DAYS).default(DEFAULT_STATS_DAYS),
});

const dailySchema = z.object({
  date: z.string(),
  orders: z.number().int(),
  usdCents: z.number().int(),
});

export const sellerStatsSchema = z
  .object({ daily: z.array(dailySchema), toShip: z.number().int() })
  .meta({ id: 'SellerStats' });

export const platformStatsSchema = z
  .object({
    daily: z.array(dailySchema),
    byStatus: z.partialRecord(orderStatusSchema, z.number().int()),
    topSellers: z.array(
      z.object({
        sellerId: z.string(),
        shopName: z.string(),
        orders: z.number().int(),
        usdCents: z.number().int(),
      }),
    ),
  })
  .meta({ id: 'PlatformStats' });

export type StatsQuery = z.infer<typeof statsQuerySchema>;
