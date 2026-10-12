import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';

import type { UserRole } from '@/api/gateway.schema';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { AuthStatus } from '@/enums/auth-status.enum';

import { useAuth } from '../hooks/useAuth';

interface RequireRoleProps {
  roles: readonly UserRole[];
  children: ReactNode;
}

/** Area guard: signs visitors in first, and tells signed-in users without the role so. */
export const RequireRole = ({ roles, children }: RequireRoleProps): ReactElement => {
  const { t } = useTranslation();
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === AuthStatus.Loading) return <p role="status">{t('common.loading')}</p>;
  if (user === null) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (!roles.includes(user.role)) {
    return <EmptyState title={t('access.deniedTitle')} description={t('access.deniedText')} />;
  }
  return <>{children}</>;
};
