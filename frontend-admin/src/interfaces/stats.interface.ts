import type { paths } from '@/api/order.schema';

/** Shapes taken from the generated contracts — never written by hand (plan DS-01). */
export type SellerStats =
  paths['/api/v1/seller/stats']['get']['responses'][200]['content']['application/json'];
export type PlatformStats =
  paths['/api/v1/admin/stats']['get']['responses'][200]['content']['application/json'];
export type DailyFigure = SellerStats['daily'][number];

export interface ChartBar {
  label: string;
  value: number;
  /** Text read for the bar (the visual value is not enough). */
  description: string;
}
