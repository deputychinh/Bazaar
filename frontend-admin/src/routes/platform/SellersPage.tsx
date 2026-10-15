import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { SellerApplicationStatus } from '@/api/gateway.schema';
import { Button } from '@/components/Button/Button';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { ReasonForm } from '@/components/ReasonForm/ReasonForm';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { AlertTone } from '@/enums/alert-tone.enum';
import { useApplications, useReview } from '@/features/platform/hooks/usePlatform';
import { failureCode } from '@/utils/api-error.util';

import './PlatformList.css';

/** Seller applications: pending first; approving gives the seller a shop (catalog, by event). */
export const SellersPage = (): ReactElement => {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status =
    Object.values(SellerApplicationStatus).find((value) => value === params.get('status')) ??
    SellerApplicationStatus.PENDING;
  const applications = useApplications({ status });
  const review = useReview();

  return (
    <main id="main" className="page container">
      <h1>{t('sellers.title')}</h1>
      <label className="platform-list__filter">
        {t('sellers.status')}
        <select value={status} onChange={(event) => setParams({ status: event.target.value })}>
          {Object.values(SellerApplicationStatus).map((value) => (
            <option key={value} value={value}>
              {t(`status.${value}`)}
            </option>
          ))}
        </select>
      </label>
      {review.isError && (
        <FormAlert tone={AlertTone.Error}>
          <p>{t(`errors.${failureCode(review.error)}`, { defaultValue: t('errors.INTERNAL') })}</p>
        </FormAlert>
      )}
      {applications.isPending ? (
        <p role="status">{t('common.loading')}</p>
      ) : applications.isError ? (
        <ErrorState error={applications.error} onRetry={() => void applications.refetch()} />
      ) : applications.data.items.length === 0 ? (
        <EmptyState title={t('sellers.none')} />
      ) : (
        <ul className="platform-list">
          {applications.data.items.map((application) => (
            <li key={application.id} className="platform-list__item">
              <div className="platform-list__row">
                <strong>{application.shopName}</strong>
                <StatusBadge status={application.status} />
              </div>
              <span className="platform-list__meta">
                {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
                  new Date(application.createdAt),
                )}
              </span>
              {application.rejectionReason !== null && (
                <span className="platform-list__meta">
                  {t('sellers.reason', { reason: application.rejectionReason })}
                </span>
              )}
              {application.status === SellerApplicationStatus.PENDING && (
                <div className="platform-list__row">
                  <Button
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: application.id })}
                  >
                    {t('sellers.approve')}
                  </Button>
                  <ReasonForm
                    actionLabel={t('sellers.reject')}
                    isBusy={review.isPending}
                    onConfirm={(reason) => review.mutate({ id: application.id, reason })}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};
