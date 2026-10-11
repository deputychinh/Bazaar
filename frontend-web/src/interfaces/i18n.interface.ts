import type messages from '@/i18n/messages/en.json';
import type { routing } from '@/i18n/routing';

/** English messages are the reference shape: a missing or misspelled key fails type-checking. */
export type IntlMessages = typeof messages;

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: IntlMessages;
  }
}
