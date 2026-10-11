import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import type { Locale } from '@/api/gateway.schema';

import { routing } from './routing';

/**
 * Reads the [locale] segment of a page or layout: 404 for unknown locales, and tells next-intl
 * the locale so the page can still be rendered statically.
 */
export const pageLocale = async (params: Promise<{ locale: string }>): Promise<Locale> => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
};
