import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { ProductSort } from '@/api/catalog.schema';
import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { Link } from '@/i18n/navigation';
import type { CatalogQuery } from '@/interfaces/catalog.interface';
import { catalogHref } from '@/utils/catalog-query.util';
import { cx } from '@/utils/cx.util';

import './SortBar.css';

interface SortBarProps {
  query: CatalogQuery;
  pathname: string;
  page: number;
  totalPages: number;
}

const TAB_SORTS = [ProductSort.newest, ProductSort.best_selling, ProductSort.rating] as const;
const PRICE_SORTS = [ProductSort.price_asc, ProductSort.price_desc] as const;

/** Marketplace sort tabs over the grid, with a compact pager on the right. */
export const SortBar = ({ query, pathname, page, totalPages }: SortBarProps): ReactElement => {
  const t = useTranslations('catalog');
  const tPage = useTranslations('pagination');
  // The API's default: relevance when searching, newest otherwise.
  const current =
    query.sort ?? (query.q === undefined ? ProductSort.newest : ProductSort.relevance);
  const sorts = query.q === undefined ? TAB_SORTS : [ProductSort.relevance, ...TAB_SORTS];
  const hrefFor = (sort: ProductSort): string =>
    catalogHref(pathname, { ...query, sort, page: undefined });
  const option = (sort: ProductSort, className: string): ReactElement => (
    <Link
      key={sort}
      className={cx(className, sort === current && `${className}--current`)}
      href={hrefFor(sort)}
      aria-current={sort === current ? 'true' : undefined}
      rel="nofollow"
    >
      {t(`sorts.${sort}`)}
    </Link>
  );
  return (
    <nav className="sort-bar" aria-label={t('sort')}>
      <span className="sort-bar__label">{t('sort')}</span>
      <div className="sort-bar__tabs">
        {sorts.map((sort) => option(sort, 'sort-bar__tab'))}
        <span className="sort-bar__price">
          {PRICE_SORTS.map((sort) => option(sort, 'sort-bar__tab'))}
        </span>
      </div>
      {totalPages > 1 && (
        <div className="sort-bar__pager">
          <span className="sort-bar__position">
            <strong className="sort-bar__page">{page}</strong>/{totalPages}
          </span>
          {page > 1 ? (
            <Link
              className="sort-bar__step"
              href={catalogHref(pathname, { ...query, page: page - 1 })}
              aria-label={tPage('previous')}
            >
              <Icon className="sort-bar__flip" name={IconName.ChevronRight} />
            </Link>
          ) : (
            <span className="sort-bar__step is-disabled" aria-hidden="true">
              <Icon className="sort-bar__flip" name={IconName.ChevronRight} />
            </span>
          )}
          {page < totalPages ? (
            <Link
              className="sort-bar__step"
              href={catalogHref(pathname, { ...query, page: page + 1 })}
              aria-label={tPage('next')}
            >
              <Icon name={IconName.ChevronRight} />
            </Link>
          ) : (
            <span className="sort-bar__step is-disabled" aria-hidden="true">
              <Icon name={IconName.ChevronRight} />
            </span>
          )}
        </div>
      )}
    </nav>
  );
};
