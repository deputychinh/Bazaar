import type { ReactElement, ReactNode } from 'react';

import { AlertTone } from '@/enums/alert-tone.enum';

import './FormAlert.css';

interface FormAlertProps {
  tone: AlertTone;
  children: ReactNode;
}

/** Result of a form submission; errors interrupt screen readers, successes wait politely. */
export const FormAlert = ({ tone, children }: FormAlertProps): ReactElement => (
  <div
    className={`form-alert form-alert--${tone}`}
    role={tone === AlertTone.Error ? 'alert' : 'status'}
  >
    {children}
  </div>
);
