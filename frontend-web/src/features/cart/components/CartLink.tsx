'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { Link } from '@/i18n/navigation';

import { useCart } from '../useCart';

import './CartLink.css';

/** Header cart icon with the item count; the count only appears once the stored cart is known. */
export const CartLink = (): ReactElement => {
  const t = useTranslations('nav');
  const { count, isReady } = useCart();
  return (
    <Link className="cart-link" href="/cart" aria-label={t('cartWithCount', { count })}>
      <Icon className="cart-link__icon" name={IconName.Cart} />
      {isReady && count > 0 && (
        <span className="cart-link__badge" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
};
