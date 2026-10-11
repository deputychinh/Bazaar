import type { Metadata } from 'next';

import type { Locale } from '@/api/gateway.schema';
import { DEFAULT_LOCALE, LOCALES } from '@/constants/locale.constant';

/** Canonical URL plus hreflang links to the same page in every language. */
export const localizedAlternates = (
  locale: Locale,
  path = '',
): NonNullable<Metadata['alternates']> => ({
  canonical: `/${locale}${path}`,
  languages: {
    ...Object.fromEntries(LOCALES.map((candidate) => [candidate, `/${candidate}${path}`])),
    'x-default': `/${DEFAULT_LOCALE}${path}`,
  },
});
