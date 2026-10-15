import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { SellerOrderStatus } from '@/api/order.schema';
import { Button } from '@/components/Button/Button';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { Pagination } from '@/components/Pagination/Pagination';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { SELLER_ORDERS_PAGE_SIZE } from '@/constants/orders.constant';
import { AlertTone } from '@/enums/alert-tone.enum';
import { useFulfil, useSellerOrders } from '@/features/orders/hooks/useSellerOrders';
import { failureCode } from '@/utils/api-error.util';
import { cx } from '@/utils/cx.util';
import { formatUsd } from '@/utils/money.util';

import './OrdersPage.css';

const TABS = [
  SellerOrderStatus.CONFIRMED,
  SellerOrderStatus.SHIPPED,
  SellerOrderStatus.DELIVERED,
  SellerOrderStatus.CANCELLED,
] as const;

/** The seller's queue: paid orders to ship first; status and page live in the URL. */
export const OrdersPage = (): ReactElement => {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status = TABS.find((tab) => tab === params.get('status')) ?? SellerOrderStatus.CONFIRMED;
  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);
  const orders = useSellerOrders({ status, page, pageSize: SELLER_ORDERS_PAGE_SIZE });
  const fulfil = useFulfil();

  return (
    <main id="main" className="orders-page page container">
      <h1>{t('orders.title')}</h1>
      <div className="orders-page__tabs" role="group" aria-label={t('orders.filter')}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={cx('orders-page__tab', tab === status && 'is-active')}
            aria-pressed={tab === status}
            onClick={() => setParams(new URLSearchParams({ status: tab }))}
          >
            {t(`status.${tab}`)}
          </button>
        ))}
      </div>
      {fulfil.isError && (
        <FormAlert tone={AlertTone.Error}>
          <p>{t(`errors.${failureCode(fulfil.error)}`, { defaultValue: t('errors.INTERNAL') })}</p>
        </FormAlert>
      )}
      {orders.isPending ? (
        <p role="status">{t('common.loading')}</p>
      ) : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : orders.data.items.length === 0 ? (
        <EmptyState title={t('orders.none')} />
      ) : (
        <>
          <ul className="orders-page__list">
            {orders.data.items.map((order) => (
              <li key={order.id} className="orders-page__item">
                <div className="orders-page__summary">
                  <strong>#{order.orderId.slice(-8).toUpperCase()}</strong>
                  <span className="orders-page__meta">
                    {new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(order.createdAt))}
                  </span>
                  <StatusBadge status={order.status} />
                </div>
                <ul className="orders-page__items">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity} ×{' '}
                      {i18n.language === 'vi' && item.title.vi ? item.title.vi : item.title.en} (
                      {item.variantSku})
                    </li>
                  ))}
                </ul>
                <div className="orders-page__actions">
                  <span>{formatUsd(order.subtotalUsdCents, i18n.language)}</span>
                  {order.status === SellerOrderStatus.CONFIRMED && (
                    <Button
                      disabled={fulfil.isPending}
                      onClick={() => fulfil.mutate({ id: order.id, step: 'ship' })}
                    >
                      {t('orders.ship')}
                    </Button>
                  )}
                  {order.status === SellerOrderStatus.SHIPPED && (
                    <Button
                      disabled={fulfil.isPending}
                      onClick={() => fulfil.mutate({ id: order.id, step: 'deliver' })}
                    >
                      {t('orders.deliver')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            totalPages={Math.ceil(orders.data.total / SELLER_ORDERS_PAGE_SIZE)}
          />
        </>
      )}
    </main>
  );
};
