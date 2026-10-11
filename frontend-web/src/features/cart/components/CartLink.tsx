'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Link } from '@/i18n/navigation';

import { useCart } from '../useCart';

import './CartLink.css';

/** Header link with the item count; the count only appears once the stored cart is known. */
export const CartLink = (): ReactElement => {
  const t = useTranslations('nav');
  const { count, isReady } = useCart();
  return (
    <Link className="cart-link" href="/cart" aria-label={t('cartWithCount', { count })}>
      {t('cart')}
      {isReady && count > 0 && (
        <span className="cart-link__badge" aria-hidden="true">
          {count}
        </span>
      )}
    </Link>
  );
};
