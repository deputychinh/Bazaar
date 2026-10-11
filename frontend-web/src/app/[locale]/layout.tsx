import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@/styles/index.css';

import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { getUsdToVnd } from '@/api/fx.server';
import type { Locale } from '@/api/gateway.schema';
import { Footer } from '@/components/Footer/Footer';
import { Header } from '@/components/Header/Header';
import { serverEnv } from '@/config/env.server';
import { CurrencyProvider } from '@/features/currency/CurrencyProvider';
import { pageLocale } from '@/i18n/page-locale';
import { routing } from '@/i18n/routing';
import { localizedAlternates } from '@/utils/alternates.util';

/** Both languages are built ahead of time; each layout render knows its locale from the URL. */
export const generateStaticParams = (): { locale: Locale }[] =>
  routing.locales.map((locale) => ({ locale }));

export const generateMetadata = async ({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'metadata' });
  return {
    metadataBase: new URL(serverEnv.SITE_URL),
    title: { default: t('title'), template: `%s · Bazaar` },
    description: t('description'),
    alternates: localizedAlternates(locale),
  };
};

const LocaleLayout = async ({
  children,
  params,
}: LayoutProps<'/[locale]'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const [t, usdToVnd] = await Promise.all([
    getTranslations({ locale, namespace: 'common' }),
    getUsdToVnd(),
  ]);
  return (
    <html lang={locale}>
      <body>
        <a className="skip-link" href="#main">
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider>
          <CurrencyProvider locale={locale} usdToVnd={usdToVnd}>
            <Header />
            {children}
            <Footer />
          </CurrencyProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
