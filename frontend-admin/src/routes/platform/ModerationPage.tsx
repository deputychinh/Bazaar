import { useState, type FormEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { ProductStatus } from '@/api/catalog.schema';
import { Button } from '@/components/Button/Button';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { Pagination } from '@/components/Pagination/Pagination';
import { ReasonForm } from '@/components/ReasonForm/ReasonForm';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { AlertTone } from '@/enums/alert-tone.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { useModerate, useModeration } from '@/features/platform/hooks/usePlatform';
import { failureCode } from '@/utils/api-error.util';

import './PlatformList.css';

const PAGE_SIZE = 20;

/** Every product on the marketplace: search, hide with a reason (sellers see it), restore. */
export const ModerationPage = (): ReactElement => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status = Object.values(ProductStatus).find((value) => value === params.get('status'));
  const q = params.get('q') ?? undefined;
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const [search, setSearch] = useState(q ?? '');
  const products = useModeration({
    page,
    pageSize: PAGE_SIZE,
    ...(status && { status }),
    ...(q && { q }),
  });
  const moderate = useModerate();

  const apply = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (status !== undefined) next.set('status', status);
    if (search.trim() !== '') next.set('q', search.trim());
    setParams(next);
  };

  return (
    <main id="main" className="page container">
      <h1>{t('moderation.title')}</h1>
      <form className="page__toolbar platform-list__toolbar" onSubmit={apply}>
        <label className="platform-list__filter">
          {t('moderation.search')}
          <input
            className="input platform-list__control"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="platform-list__filter">
          {t('products.status')}
          <select
            className="select platform-list__control"
            value={status ?? ''}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              next.delete('page');
              if (event.target.value === '') next.delete('status');
              else next.set('status', event.target.value);
              setParams(next);
            }}
          >
            <option value="">{t('products.allStatuses')}</option>
            {Object.values(ProductStatus).map((value) => (
              <option key={value} value={value}>
                {t(`status.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant={ButtonVariant.Secondary}>
          {t('moderation.apply')}
        </Button>
      </form>
      {moderate.isError && (
        <FormAlert tone={AlertTone.Error}>
          <p>
            {t(`errors.${failureCode(moderate.error)}`, { defaultValue: t('errors.INTERNAL') })}
          </p>
        </FormAlert>
      )}
      {products.isPending ? (
        <p role="status">{t('common.loading')}</p>
      ) : products.isError ? (
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      ) : products.data.items.length === 0 ? (
        <EmptyState title={t('moderation.none')} />
      ) : (
        <>
          <ul className="platform-list">
            {products.data.items.map((product) => (
              <li key={product.id} className="platform-list__item">
                <div className="platform-list__row">
                  <strong>{product.title.en}</strong>
                  <StatusBadge status={product.status} />
                </div>
                {product.hiddenReason !== null && (
                  <span className="platform-list__meta">
                    {t('moderation.hiddenBecause', { reason: product.hiddenReason })}
                  </span>
                )}
                <div className="platform-list__row">
                  {product.status === ProductStatus.HIDDEN ? (
                    <Button
                      variant={ButtonVariant.Secondary}
                      disabled={moderate.isPending}
                      onClick={() => moderate.mutate({ id: product.id })}
                    >
                      {t('moderation.restore')}
                    </Button>
                  ) : (
                    <ReasonForm
                      actionLabel={t('moderation.hide')}
                      isBusy={moderate.isPending}
                      onConfirm={(reason) =>
                        moderate.mutate({ id: product.id, hideReason: reason })
                      }
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={Math.ceil(products.data.total / PAGE_SIZE)} />
        </>
      )}
    </main>
  );
};
