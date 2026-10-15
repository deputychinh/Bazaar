import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { StatTone } from '@/enums/stat-tone.enum';
import { cx } from '@/utils/cx.util';

import './StatCard.css';

interface StatCardProps {
  label: string;
  value: string;
  icon?: IconName;
  /** Colour of the icon tile; colour is decoration only, the label says what the figure is. */
  tone?: StatTone;
}

/** One headline figure on a dashboard. */
export const StatCard = ({
  label,
  value,
  icon = IconName.Trend,
  tone = StatTone.Brand,
}: StatCardProps): ReactElement => (
  <div className="stat-card">
    <span className={cx('stat-card__icon', `stat-card__icon--${tone}`)} aria-hidden="true">
      <Icon name={icon} />
    </span>
    <div className="stat-card__text">
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
    </div>
  </div>
);
