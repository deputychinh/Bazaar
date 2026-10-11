'use client';

import { useTranslations } from 'next-intl';
import { useEffect, type ReactElement, type ReactNode } from 'react';

import { AuthStatus } from '@/enums/auth-status.enum';
import { usePathname, useRouter } from '@/i18n/navigation';

import { useAuth } from '../useAuth';

interface RequireAuthProps {
  /** Rendered once the visitor is signed in; inside, useAccessToken() is always set. */
  children: ReactNode;
}

/** Client-side gate for account pages: visitors without a session go to sign in and come back. */
export const RequireAuth = ({ children }: RequireAuthProps): ReactElement => {
  const t = useTranslations('auth');
  const { status, accessToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === AuthStatus.Anonymous) {
      router.replace({ pathname: '/login', query: { next: pathname } });
    }
  }, [status, router, pathname]);
  if (accessToken === null) return <p role="status">{t('loading')}</p>;
  return <>{children}</>;
};
