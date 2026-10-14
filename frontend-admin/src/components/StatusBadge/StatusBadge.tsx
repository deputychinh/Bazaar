import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { cx } from '@/utils/cx.util';

import './StatusBadge.css';

/** Tone per status code (products, orders, applications); unknown codes are neutral. */
const TONE: Readonly<Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'>> = {
  PUBLISHED: 'success',
  DRAFT: 'neutral',
  HIDDEN: 'danger',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CONFIRMED: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

interface StatusBadgeProps {
  status: string;
}

/** A status pill with colour and a translated label — colour is never the only signal. */
export const StatusBadge = ({ status }: StatusBadgeProps): ReactElement => {
  const { t } = useTranslation();
  return (
    <span className={cx('status-badge', `status-badge--${TONE[status] ?? 'neutral'}`)}>
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  );
};
