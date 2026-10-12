import { Locale } from '@/api/gateway.schema';

export const LOCALES = [Locale.en, Locale.vi] as const;
export const DEFAULT_LOCALE = Locale.en;
