import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense, type ReactElement } from 'react';

import { AuthCard } from '@/features/auth/components/AuthCard';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';

/** Static shell; the form talks to the gateway from the browser (same-origin rewrite). */
export const dynamic = 'force-static';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/login'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('signInTitle'), robots: { index: false } };
};

const LoginPage = async ({ params }: PageProps<'/[locale]/login'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return (
    <AuthCard
      title={t('signInTitle')}
      footer={
        <p>
          {t('noAccount')} <Link href="/register">{t('createAccount')}</Link>
        </p>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
};

export default LoginPage;
