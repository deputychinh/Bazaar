import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { ProductSort } from '@/api/catalog.schema';
import { CENTS_PER_USD } from '@/constants/currency.constant';
import type { CatalogQuery } from '@/interfaces/catalog.interface';

import './CatalogFilters.css';

interface CatalogFiltersProps {
  query: CatalogQuery;
  /** Where the form submits (the current listing, without locale prefix handling). */
  action: string;
}

const toDollars = (cents: number | undefined): string =>
  cents === undefined ? '' : String(cents / CENTS_PER_USD);

/**
 * A plain GET form: works without JavaScript and keeps every filter in the URL.
 * Prices are typed in dollars and sent as cents.
 */
export const CatalogFilters = ({ query, action }: CatalogFiltersProps): ReactElement => {
  const t = useTranslations('catalog');
  const sorts = Object.values(ProductSort).filter(
    (sort) => sort !== ProductSort.relevance || query.q !== undefined,
  );
  return (
    <form className="catalog-filters" action={action} method="get">
      <label className="catalog-filters__field catalog-filters__field--wide">
        <span className="catalog-filters__label">{t('search')}</span>
        <input
          className="catalog-filters__input"
          type="search"
          name="q"
          defaultValue={query.q}
          maxLength={100}
        />
      </label>
      <label className="catalog-filters__field">
        <span className="catalog-filters__label">{t('minPrice')}</span>
        <input
          className="catalog-filters__input"
          type="number"
          name="minPriceUsd"
          min={0}
          step="0.01"
          defaultValue={toDollars(query.minPrice)}
        />
      </label>
      <label className="catalog-filters__field">
        <span className="catalog-filters__label">{t('maxPrice')}</span>
        <input
          className="catalog-filters__input"
          type="number"
          name="maxPriceUsd"
          min={0}
          step="0.01"
          defaultValue={toDollars(query.maxPrice)}
        />
      </label>
      <label className="catalog-filters__field">
        <span className="catalog-filters__label">{t('minRating')}</span>
        <select
          className="catalog-filters__input"
          name="minRating"
          defaultValue={query.minRating ?? ''}
        >
          <option value="">{t('anyRating')}</option>
          {[4, 3, 2].map((rating) => (
            <option key={rating} value={rating}>
              {t('ratingAtLeast', { rating })}
            </option>
          ))}
        </select>
      </label>
      <label className="catalog-filters__field">
        <span className="catalog-filters__label">{t('sort')}</span>
        <select className="catalog-filters__input" name="sort" defaultValue={query.sort ?? ''}>
          <option value="">{t('sortDefault')}</option>
          {sorts.map((sort) => (
            <option key={sort} value={sort}>
              {t(`sorts.${sort}`)}
            </option>
          ))}
        </select>
      </label>
      <button className="button button--primary catalog-filters__submit" type="submit">
        {t('apply')}
      </button>
    </form>
  );
};
