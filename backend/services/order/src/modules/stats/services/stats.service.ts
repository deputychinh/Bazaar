import { Clock } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { MS_PER_DAY, TOP_SELLERS_COUNT } from '../../../constants/stats.constant.js';
import type {
  DailyFigure,
  PlatformFigures,
  SellerFigures,
} from '../../../interfaces/stats.interface.js';
import { StatsRepository } from '../repositories/stats.repository.js';

/** Dashboard figures over the last N UTC days, with empty days filled in (plan FR-11). */
@Injectable()
export class StatsService {
  public constructor(
    private readonly stats: StatsRepository,
    private readonly clock: Clock,
  ) {}

  public async seller(sellerId: string, days: number): Promise<SellerFigures> {
    const { since, dates } = this.window(days);
    const figures = await this.stats.sellerFigures(sellerId, since);
    return { ...figures, daily: StatsService.fill(dates, figures.daily) };
  }

  public async platform(days: number): Promise<PlatformFigures> {
    const { since, dates } = this.window(days);
    const figures = await this.stats.platformFigures(since, TOP_SELLERS_COUNT);
    return { ...figures, daily: StatsService.fill(dates, figures.daily) };
  }

  /** Midnight UTC `days - 1` days ago, and every date up to today. */
  private window(days: number): { since: Date; dates: string[] } {
    const today = new Date(this.clock.now().toISOString().slice(0, 10));
    const since = new Date(today.getTime() - (days - 1) * MS_PER_DAY);
    const dates = Array.from({ length: days }, (_, index) =>
      new Date(since.getTime() + index * MS_PER_DAY).toISOString().slice(0, 10),
    );
    return { since, dates };
  }

  private static fill(dates: readonly string[], daily: readonly DailyFigure[]): DailyFigure[] {
    const byDate = new Map(daily.map((figure) => [figure.date, figure]));
    return dates.map((date) => byDate.get(date) ?? { date, orders: 0, usdCents: 0 });
  }
}
