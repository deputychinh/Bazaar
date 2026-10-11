import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { PAGINATION_WINDOW } from '@/constants/catalog.constant';
import { Link } from '@/i18n/navigation';
import { cx } from '@/utils/cx.util';

import './Pagination.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Builds the URL of a page, keeping the current filters. */
  hrefFor: (page: number) => string;
}

/** Page numbers around the current page, plus first and last. */
export const pageWindow = (page: number, totalPages: number): number[] => {
  const pages = new Set([1, totalPages]);
  for (let offset = -PAGINATION_WINDOW; offset <= PAGINATION_WINDOW; offset += 1) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= totalPages) pages.add(candidate);
  }
  return [...pages].sort((a, b) => a - b);
};

export const Pagination = ({ page, totalPages, hrefFor }: PaginationProps): ReactElement | null => {
  const t = useTranslations('pagination');
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label={t('label')}>
      {page > 1 && (
        <Link className="pagination__link" href={hrefFor(page - 1)} rel="prev">
          {t('previous')}
        </Link>
      )}
      {pageWindow(page, totalPages).map((number) => (
        <Link
          key={number}
          className={cx('pagination__link', number === page && 'pagination__link--current')}
          href={hrefFor(number)}
          aria-current={number === page ? 'page' : undefined}
          aria-label={t('page', { number })}
        >
          {number}
        </Link>
      ))}
      {page < totalPages && (
        <Link className="pagination__link" href={hrefFor(page + 1)} rel="next">
          {t('next')}
        </Link>
      )}
    </nav>
  );
};
