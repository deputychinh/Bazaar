const THOUSAND = 1000;

/** Marketplace style counts: 950, 1.2k, 12k (vi: 1,2k). */
export const formatCompactCount = (count: number, locale: string): string =>
  count < THOUSAND
    ? String(count)
    : `${new Intl.NumberFormat(locale, { maximumFractionDigits: count < 10 * THOUSAND ? 1 : 0 }).format(count / THOUSAND)}k`;
