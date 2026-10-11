'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Price } from '@/features/currency/components/Price';
import { Link } from '@/i18n/navigation';
import { groupByShop, lineTotalUsdCents } from '@/utils/cart.util';
import { pickLocalized } from '@/utils/localized-text.util';

import { useCart } from '../useCart';

import { QuantityStepper } from './QuantityStepper';

import './CartView.css';

/** Cart grouped by shop (one seller order each); totals are summed in USD cents, then shown once. */
export const CartView = (): ReactElement => {
  const t = useTranslations('cart');
  const tCurrency = useTranslations('currency');
  const locale = useLocale();
  const { lines, subtotalUsdCents, isReady, setQuantity, remove } = useCart();
  if (!isReady) return <p className="cart-view__loading">{t('loading')}</p>;
  if (lines.length === 0) {
    return (
      <EmptyState
        title={t('empty')}
        description={t('emptyHint')}
        action={<Link href="/search">{t('browse')}</Link>}
      />
    );
  }
  return (
    <div className="cart-view">
      <div className="cart-view__groups">
        {groupByShop(lines).map((group) => (
          <section
            key={group.shop.slug}
            className="cart-view__group"
            aria-labelledby={`shop-${group.shop.slug}`}
          >
            <h2 id={`shop-${group.shop.slug}`} className="cart-view__shop">
              <Link href={`/s/${group.shop.slug}`}>{group.shop.name}</Link>
            </h2>
            <ul className="cart-view__lines">
              {group.lines.map((line) => {
                const title = pickLocalized(line.title, locale);
                return (
                  <li key={line.sku} className="cart-view__line">
                    <div className="cart-view__thumb">
                      {line.imageUrl !== null && (
                        <Image
                          className="cart-view__image"
                          src={line.imageUrl}
                          alt=""
                          fill
                          sizes="64px"
                        />
                      )}
                    </div>
                    <div className="cart-view__details">
                      <Link className="cart-view__title" href={`/p/${line.productSlug}`}>
                        {title}
                      </Link>
                      <span className="cart-view__variant">
                        {pickLocalized(line.variantLabel, locale)}
                      </span>
                      <Price usdCents={line.unitPriceUsdCents} />
                    </div>
                    <QuantityStepper
                      value={line.quantity}
                      max={line.maxQuantity}
                      label={title}
                      onChange={(quantity) => setQuantity(line.sku, quantity)}
                    />
                    <Price usdCents={lineTotalUsdCents(line)} />
                    <button
                      type="button"
                      className="cart-view__remove"
                      aria-label={t('removeItem', { name: title })}
                      onClick={() => remove(line.sku)}
                    >
                      {t('remove')}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="cart-view__shop-total">
              {t('shopSubtotal')} <Price usdCents={group.subtotalUsdCents} />
            </p>
          </section>
        ))}
      </div>
      <aside className="cart-view__summary" aria-label={t('summary')}>
        <p className="cart-view__total">
          {t('subtotal')} <Price usdCents={subtotalUsdCents} isLarge />
        </p>
        <p className="cart-view__note">{t('pricesConfirmed')}</p>
        <p className="cart-view__note">{tCurrency('approximate')}</p>
      </aside>
    </div>
  );
};
