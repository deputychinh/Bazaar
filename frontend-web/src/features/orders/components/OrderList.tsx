'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState, type ReactElement } from 'react';

import { EmptyState } from '@/components/EmptyState/EmptyState';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Pagination } from '@/components/Pagination/Pagination';
import { useAccessToken } from '@/features/auth/useAccessToken';
import { Price } from '@/features/currency/components/Price';
import { Link } from '@/i18n/navigation';
import type { ApiResult } from '@/interfaces/api-result.interface';
import type { OrderPage } from '@/interfaces/order.interface';

import { listOrders } from '../order-api';

import { OrderStatusBadge } from './OrderStatusBadge';

import './OrderList.css';

interface OrderListProps {
  page: number;
}

export const OrderList = ({ page }: OrderListProps): ReactElement => {
  const accessToken = useAccessToken();
  const t = useTranslations('orders');
  const format = useFormatter();
  const [result, setResult] = useState<ApiResult<OrderPage> | null>(null);
  useEffect(() => {
    let isCurrent = true;
    void listOrders(accessToken, page).then((answer) => {
      if (isCurrent) setResult(answer);
    });
    return () => {
      isCurrent = false;
    };
  }, [accessToken, page]);

  if (result === null) return <p role="status">{t('loading')}</p>;
  if (result.errorCode !== null) return <ErrorState code={result.errorCode} />;
  if (result.data.items.length === 0) {
    return (
      <EmptyState title={t('none')} action={<Link href="/search">{t('startShopping')}</Link>} />
    );
  }
  return (
    <div className="stack">
      <ul className="order-list">
        {result.data.items.map((order) => (
          <li key={order.id} className="order-list__item">
            <Link className="order-list__link" href={`/orders/${order.id}`}>
              <span className="order-list__date">
                {format.dateTime(new Date(order.createdAt), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
              <span className="order-list__count">
                {t('items', {
                  count: order.sellerOrders.reduce(
                    (sum, part) =>
                      sum + part.items.reduce((items, item) => items + item.quantity, 0),
                    0,
                  ),
                })}
              </span>
              <Price usdCents={order.totalUsdCents} />
              <OrderStatusBadge status={order.status} />
            </Link>
          </li>
        ))}
      </ul>
      <Pagination
        page={result.data.page}
        totalPages={Math.ceil(result.data.total / result.data.pageSize)}
        hrefFor={(target) => (target === 1 ? '/orders' : `/orders?page=${target}`)}
      />
    </div>
  );
};
