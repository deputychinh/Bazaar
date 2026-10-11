import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AccountPanel } from '@/features/auth/components/AccountPanel';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { pageLocale } from '@/i18n/page-locale';

/** Static shell; the form talks to the gateway from the browser (same-origin rewrite). */
export const dynamic = 'force-static';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/account'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('accountTitle'), robots: { index: false } };
};

const AccountPage = async ({ params }: PageProps<'/[locale]/account'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return (
    <AuthCard title={t('accountTitle')}>
      <AccountPanel />
    </AuthCard>
  );
};

export default AccountPage;
