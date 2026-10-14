import type { OrderStatus } from '@bazaar/contracts';

export interface DailyFigure {
  /** UTC day, YYYY-MM-DD. */
  date: string;
  orders: number;
  usdCents: number;
}

export interface SellerFigures {
  daily: DailyFigure[];
  toShip: number;
}

export interface TopSeller {
  sellerId: string;
  shopName: string;
  orders: number;
  usdCents: number;
}

export interface PlatformFigures {
  daily: DailyFigure[];
  byStatus: Partial<Record<OrderStatus, number>>;
  topSellers: TopSeller[];
}

/** Raw rows of the reporting queries (MySQL returns COUNT/SUM as bigint). */
export interface DailyRow {
  day: Date | string;
  orders: bigint | number;
  cents: bigint | number | null;
}

export interface TopSellerRow {
  seller_id: string;
  shop_name: string;
  orders: bigint | number;
  cents: bigint | number | null;
}
