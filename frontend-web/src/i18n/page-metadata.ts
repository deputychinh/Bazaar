import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/api/gateway.schema';
import { localizedAlternates } from '@/utils/alternates.util';

/** Title, description and hreflang of a static page whose texts live under `namespace`. */
export const staticPageMetadata = async (
  locale: Locale,
  namespace: 'pricing' | 'about' | 'sell',
  path: string,
): Promise<Metadata> => {
  const t = await getTranslations({ locale, namespace });
  return {
    title: t('title'),
    description: t('lead'),
    alternates: localizedAlternates(locale, path),
  };
};
