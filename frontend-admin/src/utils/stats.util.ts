import type { ChartBar, DailyFigure } from '@/interfaces/stats.interface';

import { formatUsd } from './money.util';

export const totalCents = (daily: readonly DailyFigure[]): number =>
  daily.reduce((sum, day) => sum + day.usdCents, 0);

export const totalOrders = (daily: readonly DailyFigure[]): number =>
  daily.reduce((sum, day) => sum + day.orders, 0);

/** One bar per day, described with its date and amount for screen readers. */
export const dailyBars = (daily: readonly DailyFigure[], locale: string): ChartBar[] =>
  daily.map((day) => ({
    label: day.date,
    value: day.usdCents,
    description: `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(day.date))}: ${formatUsd(day.usdCents, locale)}`,
  }));
