import type { ChartBar, DailyFigure } from '@/interfaces/stats.interface';

import { formatUsd } from './money.util';

export const totalCents = (daily: readonly DailyFigure[]): number =>
  daily.reduce((sum, day) => sum + day.usdCents, 0);

export const totalOrders = (daily: readonly DailyFigure[]): number =>
  daily.reduce((sum, day) => sum + day.orders, 0);

const DAY_MS = 86_400_000;

/**
 * Every day of the window ending on `today` (UTC), oldest first. The API leaves out days without
 * orders; the chart needs them as zero so 30 days always span the same width.
 */
export const fillDays = (
  daily: readonly DailyFigure[],
  days: number,
  today: Date,
): DailyFigure[] => {
  const byDate = new Map(daily.map((day) => [day.date, day]));
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10);
    return byDate.get(date) ?? { date, orders: 0, usdCents: 0 };
  });
};

/** One bar per day, described with its date and amount for screen readers. */
export const dailyBars = (daily: readonly DailyFigure[], locale: string): ChartBar[] =>
  daily.map((day) => ({
    label: day.date,
    value: day.usdCents,
    description: `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(day.date))}: ${formatUsd(day.usdCents, locale)}`,
  }));

/** Axis label of a day: "Oct 11" / "11 thg 10". */
export const shortDate = (date: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(date),
  );

/** First and last day of a filled window, for the chart axis. */
export const axisLabels = (
  days: readonly DailyFigure[],
  locale: string,
): { startLabel?: string; endLabel?: string } => {
  const first = days[0];
  const last = days.at(-1);
  return {
    ...(first && { startLabel: shortDate(first.date, locale) }),
    ...(last && { endLabel: shortDate(last.date, locale) }),
  };
};
