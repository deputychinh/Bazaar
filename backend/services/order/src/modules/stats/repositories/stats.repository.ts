import type { OrderStatus } from '@bazaar/contracts';

import type { PlatformFigures, SellerFigures } from '../../../interfaces/stats.interface.js';

/** Port to the reporting queries (plan FR-11). Days without orders are simply absent. */
export abstract class StatsRepository {
  /** Sales of one seller: parts not cancelled, by the day the order was placed. */
  public abstract sellerFigures(sellerId: string, since: Date): Promise<SellerFigures>;

  /** Platform: GMV of paid orders by day, orders by status, best sellers by sales. */
  public abstract platformFigures(since: Date, topCount: number): Promise<PlatformFigures>;

  /** Every order by its current status: the saga state gauge (plan §9.3). */
  public abstract ordersByStatus(): Promise<Partial<Record<OrderStatus, number>>>;
}
