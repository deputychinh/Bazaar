import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { OrderList } from '@/features/orders/components/OrderList';
import { pageLocale } from '@/i18n/page-locale';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/orders'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'orders' });
  return { title: t('title'), robots: { index: false } };
};

const OrdersPage = async ({
  params,
  searchParams,
}: PageProps<'/[locale]/orders'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'orders' });
  const { page } = await searchParams;
  const pageNumber = Math.max(1, Number.parseInt(typeof page === 'string' ? page : '1', 10) || 1);
  return (
    <main id="main" className="container stack">
      <h1>{t('title')}</h1>
      <RequireAuth>
        <OrderList page={pageNumber} />
      </RequireAuth>
    </main>
  );
};

export default OrdersPage;
