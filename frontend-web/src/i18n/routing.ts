import { defineRouting } from 'next-intl/routing';

import { DEFAULT_LOCALE, LOCALES } from '@/constants/locale.constant';

/** Every page lives under /en or /vi; "/" redirects by cookie, then Accept-Language (ADR 0012). */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});
