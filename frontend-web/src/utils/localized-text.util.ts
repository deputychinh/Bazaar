import { Locale } from '@/api/gateway.schema';
import type { LocalizedText } from '@/interfaces/localized-text.interface';

/** Text in the visitor's language, falling back to English when Vietnamese is missing (ADR 0012). */
export const pickLocalized = (text: LocalizedText, locale: Locale): string =>
  locale === Locale.vi && text.vi !== undefined && text.vi !== null && text.vi !== ''
    ? text.vi
    : text.en;
