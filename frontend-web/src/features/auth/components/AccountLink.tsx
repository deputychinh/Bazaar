'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { AuthStatus } from '@/enums/auth-status.enum';
import { Link } from '@/i18n/navigation';

import { useAuth } from '../useAuth';

export const AccountLink = (): ReactElement => {
  const t = useTranslations('auth');
  const { status } = useAuth();
  return status === AuthStatus.Authenticated ? (
    <Link className="header__link" href="/account">
      {t('account')}
    </Link>
  ) : (
    <Link className="header__link" href="/login">
      {t('signIn')}
    </Link>
  );
};
