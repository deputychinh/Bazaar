import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { OrderDetail } from '@/features/orders/components/OrderDetail';
import { pageLocale } from '@/i18n/page-locale';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/orders/[id]'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'orders' });
  return { title: t('detailTitle'), robots: { index: false } };
};

const OrderPage = async ({ params }: PageProps<'/[locale]/orders/[id]'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'orders' });
  const { id } = await params;
  return (
    <main id="main" className="page container">
      <h1>{t('detailTitle')}</h1>
      <RequireAuth>
        <OrderDetail orderId={id} />
      </RequireAuth>
    </main>
  );
};

export default OrderPage;
