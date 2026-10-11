import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import type { OrderStatus, SellerOrderStatus } from '@/api/order.schema';
import { cx } from '@/utils/cx.util';

import './OrderStatusBadge.css';

interface OrderStatusBadgeProps {
  status: OrderStatus | SellerOrderStatus;
}

/** Shared by order and seller order statuses (same codes, same meaning). */
const TONE: Readonly<Record<string, 'info' | 'success' | 'warning' | 'danger'>> = {
  PENDING: 'warning',
  RESERVED: 'warning',
  PAID: 'info',
  CONFIRMED: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

/** Status pill with a colour tone and a translated label (statuses are API codes). */
export const OrderStatusBadge = ({ status }: OrderStatusBadgeProps): ReactElement => {
  const t = useTranslations('orders.status');
  return (
    <span className={cx('order-status-badge', `order-status-badge--${TONE[status] ?? 'info'}`)}>
      {t(status)}
    </span>
  );
};
