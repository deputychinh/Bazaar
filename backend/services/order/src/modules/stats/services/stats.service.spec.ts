import { FixedClock } from '@bazaar/nest-common';

import type { PlatformFigures, SellerFigures } from '../../../interfaces/stats.interface.js';
import { StatsRepository } from '../repositories/stats.repository.js';

import { StatsService } from './stats.service.js';

class FakeStats extends StatsRepository {
  public since: Date | undefined;

  public sellerFigures(_sellerId: string, since: Date): Promise<SellerFigures> {
    this.since = since;
    return Promise.resolve({
      daily: [{ date: '2026-10-10', orders: 2, usdCents: 3000 }],
      toShip: 1,
    });
  }

  public platformFigures(since: Date, topCount: number): Promise<PlatformFigures> {
    this.since = since;
    return Promise.resolve({
      daily: [],
      byStatus: { CONFIRMED: 3 },
      topSellers: [] as never[],
      ...{ topCount },
    } as PlatformFigures);
  }
}

describe('StatsService', () => {
  const clock = new FixedClock(new Date('2026-10-11T15:30:00.000Z'));

  it('covers the last N UTC days and fills days without sales', async () => {
    const stats = new FakeStats();
    const figures = await new StatsService(stats, clock).seller('seller-1', 3);

    expect(stats.since?.toISOString()).toBe('2026-10-09T00:00:00.000Z');
    expect(figures).toEqual({
      toShip: 1,
      daily: [
        { date: '2026-10-09', orders: 0, usdCents: 0 },
        { date: '2026-10-10', orders: 2, usdCents: 3000 },
        { date: '2026-10-11', orders: 0, usdCents: 0 },
      ],
    });
  });

  it('gives the platform a full daily series too', async () => {
    const figures = await new StatsService(new FakeStats(), clock).platform(7);
    expect(figures.daily).toHaveLength(7);
    expect(figures.byStatus).toEqual({ CONFIRMED: 3 });
  });
});
