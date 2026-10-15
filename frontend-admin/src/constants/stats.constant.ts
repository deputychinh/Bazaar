import { OrderStatus } from '@/api/order.schema';
import { IconName } from '@/enums/icon-name.enum';
import { StatTone } from '@/enums/stat-tone.enum';
import type { StatusLook } from '@/interfaces/stats.interface';

/** Dashboards cover the last 30 days. */
export const STATS_DAYS = 30;

/** Icon and tone of each order status card on the platform dashboard. */
export const ORDER_STATUS_LOOK: Partial<Record<string, StatusLook>> = {
  [OrderStatus.PENDING]: { icon: IconName.Clock, tone: StatTone.Warning },
  [OrderStatus.RESERVED]: { icon: IconName.Box, tone: StatTone.Warning },
  [OrderStatus.PAID]: { icon: IconName.Card, tone: StatTone.Info },
  [OrderStatus.CONFIRMED]: { icon: IconName.Check, tone: StatTone.Info },
  [OrderStatus.COMPLETED]: { icon: IconName.Package, tone: StatTone.Success },
  [OrderStatus.CANCELLED]: { icon: IconName.Flag, tone: StatTone.Danger },
};
