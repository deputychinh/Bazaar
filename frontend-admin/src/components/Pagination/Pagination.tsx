import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import './Pagination.css';

interface PaginationProps {
  page: number;
  totalPages: number;
}

/** Previous / next links that keep the other URL filters (server-side paging, plan §6A.4). */
export const Pagination = ({ page, totalPages }: PaginationProps): ReactElement | null => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  if (totalPages <= 1) return null;
  const hrefFor = (target: number): string => {
    const next = new URLSearchParams(params);
    if (target === 1) next.delete('page');
    else next.set('page', String(target));
    const search = next.toString();
    return search === '' ? '?' : `?${search}`;
  };
  return (
    <nav className="pagination" aria-label={t('pagination.label')}>
      {page > 1 && (
        <Link className="pagination__link" to={hrefFor(page - 1)}>
          {t('pagination.previous')}
        </Link>
      )}
      <span className="pagination__current">
        {t('pagination.pageOf', { page, total: totalPages })}
      </span>
      {page < totalPages && (
        <Link className="pagination__link" to={hrefFor(page + 1)}>
          {t('pagination.next')}
        </Link>
      )}
    </nav>
  );
};
