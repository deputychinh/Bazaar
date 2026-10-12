import type { ButtonHTMLAttributes, ReactElement } from 'react';

import { ButtonVariant } from '@/enums/button-variant.enum';
import { cx } from '@/utils/cx.util';

import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isFullWidth?: boolean;
}

export const Button = ({
  variant = ButtonVariant.Primary,
  isFullWidth = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps): ReactElement => (
  <button
    type={type}
    className={cx('button', `button--${variant}`, isFullWidth && 'button--full-width', className)}
    {...rest}
  />
);
