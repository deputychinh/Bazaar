import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AuthCard } from '@/features/auth/components/AuthCard';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';

/** Static shell; the form talks to the gateway from the browser (same-origin rewrite). */
export const dynamic = 'force-static';

export const generateMetadata = async ({
  params,
}: PageProps<'/[locale]/register'>): Promise<Metadata> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('registerTitle'), robots: { index: false } };
};

const RegisterPage = async ({ params }: PageProps<'/[locale]/register'>): Promise<ReactElement> => {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'auth' });
  return (
    <AuthCard
      title={t('registerTitle')}
      footer={
        <p>
          {t('haveAccount')} <Link href="/login">{t('signIn')}</Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
};

export default RegisterPage;
