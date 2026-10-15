'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { AuthStatus } from '@/enums/auth-status.enum';
import { IconName } from '@/enums/icon-name.enum';
import { Link } from '@/i18n/navigation';

import { useAuth } from '../useAuth';

export const AccountLink = (): ReactElement => {
  const t = useTranslations('auth');
  const { status } = useAuth();
  return status === AuthStatus.Authenticated ? (
    <Link className="header__top-link" href="/account">
      <Icon name={IconName.User} />
      {t('account')}
    </Link>
  ) : (
    <Link className="header__top-link" href="/login">
      <Icon name={IconName.User} />
      {t('signIn')}
    </Link>
  );
};
