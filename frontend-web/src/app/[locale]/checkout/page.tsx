import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { CheckoutView } from '@/features/orders/components/CheckoutView';
import { pageLocale } from '@/i18n/page-locale';

/** Static shell; cart and session live in the browser. */
export const dynamic = 'force-static';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/checkout'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return { title: t('title'), robots: { index: false } };
};

const CheckoutPage = async ({ params }: PageProps<'/[locale]/checkout'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return (
    <main id="main" className="container stack">
      <h1>{t('title')}</h1>
      <RequireAuth>
        <CheckoutView />
      </RequireAuth>
    </main>
  );
};

export default CheckoutPage;
