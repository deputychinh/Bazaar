import type { Locale } from '@bazaar/contracts';

export interface Contact {
  userId: string;
  email: string;
  preferredLocale: Locale;
}
