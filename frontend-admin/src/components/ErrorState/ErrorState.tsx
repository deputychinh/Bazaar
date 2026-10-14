import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button/Button';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { failureCode } from '@/utils/api-error.util';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** A failed data view: the translated problem and a retry button (plan §6A.4 UI states). */
export const ErrorState = ({ error, onRetry }: ErrorStateProps): ReactElement => {
  const { t } = useTranslation();
  const code = failureCode(error);
  return (
    <EmptyState
      title={t(`errors.${code}`, { defaultValue: t('errors.INTERNAL') })}
      action={
        onRetry === undefined ? undefined : (
          <Button variant={ButtonVariant.Secondary} onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )
      }
    />
  );
};
