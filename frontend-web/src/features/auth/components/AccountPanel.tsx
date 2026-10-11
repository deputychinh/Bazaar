'use client';

import { useTranslations } from 'next-intl';
import { useEffect, type ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { AuthStatus } from '@/enums/auth-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { useRouter } from '@/i18n/navigation';

import { useAuth } from '../useAuth';

/** The signed-in user's details; visitors without a session are sent to sign in. */
export const AccountPanel = (): ReactElement => {
  const t = useTranslations('auth');
  const { status, user, logout } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === AuthStatus.Anonymous) {
      router.replace({ pathname: '/login', query: { next: '/account' } });
    }
  }, [status, router]);
  if (user === null) return <p role="status">{t('loading')}</p>;
  return (
    <div className="stack">
      <dl className="stack">
        <div>
          <dt>{t('email')}</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>{t('memberSince')}</dt>
          <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>
      <Button variant={ButtonVariant.Secondary} onClick={() => void logout()}>
        {t('signOut')}
      </Button>
    </div>
  );
};
