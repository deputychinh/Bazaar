import type { ChangeEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { ProductStatus } from '@/api/catalog.schema';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Pagination } from '@/components/Pagination/Pagination';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { useSellerProducts } from '@/features/products/hooks/useSellerProducts';
import { formatUsd } from '@/utils/money.util';

import './ProductsPage.css';

const PAGE_SIZE = 20;

/** The seller's catalogue: status filter and page live in the URL. */
export const ProductsPage = (): ReactElement => {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const statusParam = params.get('status');
  const status = Object.values(ProductStatus).find((value) => value === statusParam);
  const products = useSellerProducts({ page, pageSize: PAGE_SIZE, ...(status && { status }) });

  const changeStatus = (event: ChangeEvent<HTMLSelectElement>): void => {
    const next = new URLSearchParams();
    if (event.target.value !== '') next.set('status', event.target.value);
    setParams(next);
  };

  return (
    <main id="main" className="products-page container stack">
      <header className="products-page__header">
        <h1>{t('products.title')}</h1>
        <Link className="button button--primary" to="/seller/products/new">
          {t('products.new')}
        </Link>
      </header>
      <label className="products-page__filter">
        {t('products.status')}
        <select value={status ?? ''} onChange={changeStatus}>
          <option value="">{t('products.allStatuses')}</option>
          {Object.values(ProductStatus).map((value) => (
            <option key={value} value={value}>
              {t(`status.${value}`)}
            </option>
          ))}
        </select>
      </label>
      {products.isPending ? (
        <p role="status">{t('common.loading')}</p>
      ) : products.isError ? (
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      ) : products.data.items.length === 0 ? (
        <EmptyState title={t('products.none')} />
      ) : (
        <>
          <table className="products-page__table">
            <thead>
              <tr>
                <th className="products-page__cell" scope="col">
                  {t('products.name')}
                </th>
                <th className="products-page__cell" scope="col">
                  {t('products.status')}
                </th>
                <th className="products-page__cell" scope="col">
                  {t('products.price')}
                </th>
                <th className="products-page__cell" scope="col">
                  {t('products.stock')}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.data.items.map((product) => (
                <tr key={product.id}>
                  <td className="products-page__cell">
                    <Link to={`/seller/products/${product.id}`}>
                      {i18n.language === 'vi' && product.title.vi
                        ? product.title.vi
                        : product.title.en}
                    </Link>
                  </td>
                  <td className="products-page__cell">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="products-page__cell">
                    {formatUsd(product.minPriceUsdCents, i18n.language)}
                  </td>
                  <td className="products-page__cell">
                    {product.variants.reduce((sum, variant) => sum + variant.stock, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(products.data.total / PAGE_SIZE)} />
        </>
      )}
    </main>
  );
};
