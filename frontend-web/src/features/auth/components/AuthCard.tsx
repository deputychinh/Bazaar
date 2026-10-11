import type { ReactElement, ReactNode } from 'react';

import './AuthCard.css';

interface AuthCardProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Narrow centred card shared by the sign-in, sign-up and password pages. */
export const AuthCard = ({ title, children, footer }: AuthCardProps): ReactElement => (
  <main id="main" className="auth-card container">
    <div className="auth-card__panel">
      <h1 className="auth-card__title">{title}</h1>
      {children}
      {footer !== undefined && <div className="auth-card__footer">{footer}</div>}
    </div>
  </main>
);
