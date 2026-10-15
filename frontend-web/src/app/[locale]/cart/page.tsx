import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { CartView } from '@/features/cart/components/CartView';
import { pageLocale } from '@/i18n/page-locale';

/** A static shell: the cart itself lives in the browser (localStorage), filled in after hydration. */
export const dynamic = 'force-static';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/cart'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'cart' });
  return { title: t('title'), robots: { index: false } };
};

const CartPage = async ({ params }: PageProps<'/[locale]/cart'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'cart' });
  return (
    <main id="main" className="page container">
      <h1>{t('title')}</h1>
      <CartView />
    </main>
  );
};

export default CartPage;
