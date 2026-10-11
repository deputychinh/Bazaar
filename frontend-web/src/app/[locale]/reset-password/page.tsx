import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense, type ReactElement } from 'react';

import { AuthCard } from '@/features/auth/components/AuthCard';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';
import { pageLocale } from '@/i18n/page-locale';

/** Static shell; the form talks to the gateway from the browser (same-origin rewrite). */
export const dynamic = 'force-static';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/reset-password'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('resetTitle'), robots: { index: false } };
};

const ResetPasswordPage = async ({
  params,
}: PageProps<'/[locale]/reset-password'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return (
    <AuthCard title={t('resetTitle')}>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
};

export default ResetPasswordPage;
