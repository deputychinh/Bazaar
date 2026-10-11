import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import type { ErrorCode } from '@/api/gateway.schema';
import { EmptyState } from '@/components/EmptyState/EmptyState';

interface ErrorStateProps {
  code: ErrorCode;
}

/** Translates an API error code; the server's message is never shown (ADR 0012). */
export const ErrorState = ({ code }: ErrorStateProps): ReactElement => {
  const t = useTranslations('errors');
  return <EmptyState title={t(code)} />;
};
