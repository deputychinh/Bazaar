import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';

import { EmptyState } from '@/components/EmptyState/EmptyState';
import { HOME_BY_ROLE } from '@/constants/area.constant';
import { AuthStatus } from '@/enums/auth-status.enum';
import { useAuth } from '@/features/auth/hooks/useAuth';

/** `/` sends each role to its area; shoppers learn this site is not for them. */
export const HomeRedirect = (): ReactElement => {
  const { t } = useTranslation();
  const { status, user } = useAuth();
  if (status === AuthStatus.Loading) return <p role="status">{t('common.loading')}</p>;
  if (user === null) return <Navigate to="/login" replace />;
  const home = HOME_BY_ROLE[user.role];
  if (home === undefined) {
    return <EmptyState title={t('access.deniedTitle')} description={t('access.deniedText')} />;
  }
  return <Navigate to={home} replace />;
};
