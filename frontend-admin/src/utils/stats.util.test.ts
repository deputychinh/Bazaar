import { dailyBars, fillDays } from './stats.util';

describe('fillDays', () => {
  it('returns every day of the window with zero for days without orders', () => {
    const days = fillDays(
      [{ date: '2026-10-14', orders: 2, usdCents: 3000 }],
      3,
      new Date('2026-10-15T18:00:00Z'),
    );

    expect(days).toEqual([
      { date: '2026-10-13', orders: 0, usdCents: 0 },
      { date: '2026-10-14', orders: 2, usdCents: 3000 },
      { date: '2026-10-15', orders: 0, usdCents: 0 },
    ]);
  });

  it('drops days outside the window', () => {
    const days = fillDays(
      [{ date: '2026-09-01', orders: 1, usdCents: 100 }],
      2,
      new Date('2026-10-15'),
    );
    expect(days.every((day) => day.orders === 0)).toBe(true);
  });
});

describe('dailyBars', () => {
  it('describes each bar with its date and amount', () => {
    expect(dailyBars([{ date: '2026-10-11', orders: 1, usdCents: 1250 }], 'en')[0]).toEqual({
      label: '2026-10-11',
      value: 1250,
      description: 'Oct 11, 2026: $12.50',
    });
  });
});
