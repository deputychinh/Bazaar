import type { ReactElement, ReactNode } from 'react';

import './EmptyState.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Shown when a list has nothing to display, or loading failed (plan §6A.4 UI states). */
export const EmptyState = ({ title, description, action }: EmptyStateProps): ReactElement => (
  <div className="empty-state">
    <h2 className="empty-state__title">{title}</h2>
    {description !== undefined && <p className="empty-state__description">{description}</p>}
    {action}
  </div>
);
