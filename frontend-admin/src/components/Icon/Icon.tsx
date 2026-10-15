import type { ReactElement } from 'react';

import { ICON_PATHS } from '@/constants/icon.constant';
import type { IconName } from '@/enums/icon-name.enum';
import { cx } from '@/utils/cx.util';

import './Icon.css';

interface IconProps {
  name: IconName;
  className?: string;
}

/** Decorative by default: the control around it carries the accessible name. */
export const Icon = ({ name, className }: IconProps): ReactElement => (
  <svg
    className={cx('icon', className)}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {ICON_PATHS[name].map((path) => (
      <path key={path} d={path} />
    ))}
  </svg>
);
