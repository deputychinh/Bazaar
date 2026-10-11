'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactElement } from 'react';

import { LOW_STOCK_THRESHOLD } from '@/constants/catalog.constant';
import { AddToCartButton } from '@/features/cart/components/AddToCartButton';
import { Price } from '@/features/currency/components/Price';
import type { CartProduct } from '@/interfaces/cart.interface';
import type { ProductVariant } from '@/interfaces/catalog.interface';
import { cx } from '@/utils/cx.util';
import { defaultVariant, variantLabel } from '@/utils/product.util';

import './ProductPurchase.css';

interface ProductPurchaseProps {
  product: CartProduct;
  variants: readonly ProductVariant[];
}

/** Variant choice, then price, stock and add-to-cart for the chosen variant. */
export const ProductPurchase = ({ product, variants }: ProductPurchaseProps): ReactElement => {
  const t = useTranslations('product');
  const [sku, setSku] = useState(() => defaultVariant(variants)?.sku);
  const variant = variants.find((candidate) => candidate.sku === sku);
  if (variant === undefined) return <p className="product-purchase__stock">{t('unavailable')}</p>;
  return (
    <div className="product-purchase">
      <Price usdCents={variant.priceUsdCents} isLarge />
      {variants.length > 1 && (
        <fieldset className="product-purchase__variants">
          <legend className="product-purchase__legend">{t('variant')}</legend>
          {variants.map((candidate) => (
            <label key={candidate.sku} className="product-purchase__option">
              <input
                className="product-purchase__input"
                type="radio"
                name="variant"
                value={candidate.sku}
                checked={candidate.sku === sku}
                disabled={candidate.stock === 0}
                onChange={() => setSku(candidate.sku)}
              />
              {variantLabel(candidate)}
            </label>
          ))}
        </fieldset>
      )}
      <p
        className={cx('product-purchase__stock', variant.stock === 0 && 'is-out')}
        aria-live="polite"
      >
        {variant.stock === 0
          ? t('outOfStock')
          : variant.stock <= LOW_STOCK_THRESHOLD
            ? t('lowStock', { count: variant.stock })
            : t('inStock')}
      </p>
      <AddToCartButton product={product} variant={variant} />
    </div>
  );
};
