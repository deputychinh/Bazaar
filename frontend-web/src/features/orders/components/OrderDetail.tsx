'use client';

import Image from 'next/image';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { OrderStatus, SellerOrderStatus } from '@/api/order.schema';
import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { FormAlert } from '@/components/FormAlert/FormAlert';
import { ORDER_POLL_INTERVAL_MS } from '@/constants/checkout.constant';
import { AlertTone } from '@/enums/alert-tone.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { useAccessToken } from '@/features/auth/useAccessToken';
import { Price } from '@/features/currency/components/Price';
import { Link } from '@/i18n/navigation';
import type { ApiResult } from '@/interfaces/api-result.interface';
import type { OrderView } from '@/interfaces/order.interface';
import { pickLocalized } from '@/utils/localized-text.util';

import { cancelSellerOrder, getOrder } from '../order-api';

import { OrderStatusBadge } from './OrderStatusBadge';

import './OrderDetail.css';

/** While the saga is deciding, the page keeps asking (live push arrives with P5). */
const IN_PROGRESS: readonly OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.RESERVED,
  OrderStatus.PAID,
];

interface OrderDetailProps {
  orderId: string;
}

export const OrderDetail = ({ orderId }: OrderDetailProps): ReactElement => {
  const accessToken = useAccessToken();
  const t = useTranslations('orders');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const locale = useLocale();
  const [result, setResult] = useState<ApiResult<OrderView> | null>(null);
  const [actionError, setActionError] = useState<ApiResult<OrderView>['errorCode']>(null);

  const load = useCallback(() => getOrder(accessToken, orderId), [accessToken, orderId]);

  useEffect(() => {
    let isCurrent = true;
    void load().then((answer) => {
      if (isCurrent) setResult(answer);
    });
    return () => {
      isCurrent = false;
    };
  }, [load]);

  const status = result?.data?.status;
  useEffect(() => {
    if (status === undefined || !IN_PROGRESS.includes(status)) return undefined;
    const timer = setInterval(() => {
      void load().then(setResult);
    }, ORDER_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status, load]);

  if (result === null) return <p role="status">{t('loading')}</p>;
  if (result.errorCode !== null) return <ErrorState code={result.errorCode} />;
  const order = result.data;

  const handleCancel = async (sellerOrderId: string): Promise<void> => {
    const answer = await cancelSellerOrder(accessToken, { orderId: order.id, sellerOrderId });
    if (answer.data === null) {
      setActionError(answer.errorCode);
      return;
    }
    setActionError(null);
    setResult(answer);
  };

  return (
    <div className="order-detail stack">
      <header className="order-detail__header">
        <div>
          <p className="order-detail__meta">
            {t('placedOn', {
              date: format.dateTime(new Date(order.createdAt), {
                dateStyle: 'long',
                timeStyle: 'short',
              }),
            })}
          </p>
          <p className="order-detail__meta">
            {t('reference', { id: order.id.slice(-8).toUpperCase() })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </header>

      <p className="order-detail__explain" aria-live="polite">
        {order.status === OrderStatus.CANCELLED && order.cancelReason !== null
          ? t(`cancelReason.${order.cancelReason}`)
          : t(`explain.${order.status}`)}
      </p>
      {actionError !== null && (
        <FormAlert tone={AlertTone.Error}>
          <p>{tErrors(actionError)}</p>
        </FormAlert>
      )}

      {order.sellerOrders.map((part) => (
        <section key={part.id} className="order-detail__part" aria-labelledby={`part-${part.id}`}>
          <header className="order-detail__part-header">
            <h2 id={`part-${part.id}`} className="order-detail__shop">
              {part.shop.name}
            </h2>
            <OrderStatusBadge status={part.status} />
          </header>
          <ul className="order-detail__items">
            {part.items.map((item) => (
              <li key={item.id} className="order-detail__item">
                <div className="order-detail__thumb">
                  {item.imageUrl !== null && (
                    <Image
                      className="order-detail__image"
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="56px"
                    />
                  )}
                </div>
                <div className="order-detail__item-text">
                  <Link href={`/p/${item.productSlug}`}>{pickLocalized(item.title, locale)}</Link>
                  <span className="order-detail__meta">
                    {pickLocalized(item.variantLabel, locale)} · {item.quantity} ×{' '}
                    <Price usdCents={item.unitPriceUsdCents} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <footer className="order-detail__part-footer">
            <span>
              {t('subtotal')} <Price usdCents={part.subtotalUsdCents} />
            </span>
            {order.status === OrderStatus.CONFIRMED &&
              part.status === SellerOrderStatus.CONFIRMED && (
                <Button
                  variant={ButtonVariant.Secondary}
                  onClick={() => void handleCancel(part.id)}
                >
                  {t('cancelPart')}
                </Button>
              )}
          </footer>
        </section>
      ))}

      <p className="order-detail__total">
        {t('total')} <Price usdCents={order.totalUsdCents} isLarge />
      </p>
      {order.payment !== null && (
        <p className="order-detail__meta">
          {t('paidWith', { last4: order.payment.cardLast4 })} ·{' '}
          {t(`payment.${order.payment.status}`)}
        </p>
      )}
    </div>
  );
};
