import { createInstance, type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { Locale } from '@/api/gateway.schema';
import { DEFAULT_LOCALE } from '@/constants/locale.constant';
import { LOCALE_STORAGE_KEY } from '@/constants/settings.constant';

import en from './messages/en.json';
import vi from './messages/vi.json';

/** The saved language, else the browser's (Vietnamese when it asks for it), else English. */
export const initialLocale = (): Locale => {
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === Locale.en || saved === Locale.vi) return saved;
  return navigator.language.toLowerCase().startsWith('vi') ? Locale.vi : DEFAULT_LOCALE;
};

/** One i18next instance for the app; JSON keys are the same in both files (parity test). */
export const createI18n = (locale: Locale): i18n => {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    resources: { en: { translation: en }, vi: { translation: vi } },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  instance.on('languageChanged', (language) => {
    document.documentElement.lang = language;
  });
  document.documentElement.lang = locale;
  return instance;
};
