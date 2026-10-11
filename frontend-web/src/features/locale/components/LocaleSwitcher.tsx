'use client';

import { useLocale, useTranslations } from 'next-intl';
import { type ChangeEvent, type ReactElement, useTransition } from 'react';

import type { Locale } from '@/api/gateway.schema';
import { LOCALES } from '@/constants/locale.constant';
import { usePathname, useRouter } from '@/i18n/navigation';

import './LocaleSwitcher.css';

/** Same page in the other language: /en/p/non-la ⇄ /vi/p/non-la. */
export const LocaleSwitcher = (): ReactElement => {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const onChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const next = event.target.value as Locale;
    startTransition(() => router.replace(pathname, { locale: next }));
  };
  return (
    <label className="locale-switcher">
      <span className="visually-hidden">{t('common.language')}</span>
      <select
        className="locale-switcher__select"
        value={locale}
        onChange={onChange}
        disabled={isPending}
      >
        {LOCALES.map((option) => (
          <option key={option} value={option} lang={option}>
            {t(`locales.${option}`)}
          </option>
        ))}
      </select>
    </label>
  );
};
