import type { ReactElement } from 'react';

import './StatCard.css';

interface StatCardProps {
  label: string;
  value: string;
}

/** One headline figure on a dashboard. */
export const StatCard = ({ label, value }: StatCardProps): ReactElement => (
  <div className="stat-card">
    <span className="stat-card__label">{label}</span>
    <strong className="stat-card__value">{value}</strong>
  </div>
);
