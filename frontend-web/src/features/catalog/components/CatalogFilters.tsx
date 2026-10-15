import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { StarRating } from '@/components/StarRating/StarRating';
import { RATING_FILTERS } from '@/constants/catalog.constant';
import { CENTS_PER_USD } from '@/constants/currency.constant';
import { IconName } from '@/enums/icon-name.enum';
import { Link } from '@/i18n/navigation';
import type { CatalogQuery } from '@/interfaces/catalog.interface';
import { catalogHref } from '@/utils/catalog-query.util';
import { cx } from '@/utils/cx.util';

import './CatalogFilters.css';

interface CatalogFiltersProps {
  query: CatalogQuery;
  /** The current listing path, without the locale prefix (/search, /c/ceramics). */
  action: string;
}

const toDollars = (cents: number | undefined): string =>
  cents === undefined ? '' : String(cents / CENTS_PER_USD);

/**
 * Sidebar filters. The price range is a plain GET form (works without JavaScript; prices typed
 * in dollars, sent as cents); ratings are links. Both keep the search text and sort.
 */
export const CatalogFilters = ({ query, action }: CatalogFiltersProps): ReactElement => {
  const t = useTranslations('catalog');
  const hasFilters =
    query.minPrice !== undefined || query.maxPrice !== undefined || query.minRating !== undefined;
  return (
    <div className="catalog-filters">
      <h2 className="catalog-filters__heading">
        <Icon name={IconName.Flag} />
        {t('filters')}
      </h2>
      <form className="catalog-filters__group" action={action} method="get">
        <h3 className="catalog-filters__title">{t('priceRange')}</h3>
        {query.q !== undefined && <input type="hidden" name="q" value={query.q} />}
        {query.sort !== undefined && <input type="hidden" name="sort" value={query.sort} />}
        {query.minRating !== undefined && (
          <input type="hidden" name="minRating" value={query.minRating} />
        )}
        <div className="catalog-filters__range">
          <label className="catalog-filters__field">
            <span className="visually-hidden">{t('minPrice')}</span>
            <input
              className="input catalog-filters__input"
              type="number"
              name="minPriceUsd"
              min={0}
              step="0.01"
              placeholder={t('minPlaceholder')}
              defaultValue={toDollars(query.minPrice)}
            />
          </label>
          <span className="catalog-filters__dash" aria-hidden="true">
            –
          </span>
          <label className="catalog-filters__field">
            <span className="visually-hidden">{t('maxPrice')}</span>
            <input
              className="input catalog-filters__input"
              type="number"
              name="maxPriceUsd"
              min={0}
              step="0.01"
              placeholder={t('maxPlaceholder')}
              defaultValue={toDollars(query.maxPrice)}
            />
          </label>
        </div>
        <button className="button button--primary button--small button--full-width" type="submit">
          {t('apply')}
        </button>
      </form>
      <div className="catalog-filters__group">
        <h3 className="catalog-filters__title">{t('minRating')}</h3>
        <ul className="catalog-filters__ratings">
          {RATING_FILTERS.map((rating) => (
            <li key={rating}>
              <Link
                className={cx(
                  'catalog-filters__rating',
                  query.minRating === rating && 'catalog-filters__rating--current',
                )}
                href={catalogHref(action, { ...query, minRating: rating, page: undefined })}
                aria-current={query.minRating === rating ? 'true' : undefined}
              >
                <StarRating average={rating} label={t('ratingAtLeast', { rating })} isLarge />
                <span aria-hidden="true">{t('andUp')}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {hasFilters && (
        <Link
          className="button button--ghost button--small button--full-width"
          href={catalogHref(action, { q: query.q, sort: query.sort })}
        >
          {t('clearFilters')}
        </Link>
      )}
    </div>
  );
};
