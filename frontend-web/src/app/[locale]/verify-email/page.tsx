import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense, type ReactElement } from 'react';

import { AuthCard } from '@/features/auth/components/AuthCard';
import { VerifyEmail } from '@/features/auth/components/VerifyEmail';
import { pageLocale } from '@/i18n/page-locale';

/** Static shell; the form talks to the gateway from the browser (same-origin rewrite). */
export const dynamic = 'force-static';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/verify-email'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('verifyTitle'), robots: { index: false } };
};

const VerifyEmailPage = async ({
  params,
}: PageProps<'/[locale]/verify-email'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return (
    <AuthCard title={t('verifyTitle')}>
      <Suspense>
        <VerifyEmail />
      </Suspense>
    </AuthCard>
  );
};

export default VerifyEmailPage;
