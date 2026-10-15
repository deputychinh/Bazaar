'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactElement } from 'react';

import { LOW_STOCK_THRESHOLD } from '@/constants/catalog.constant';
import { AddToCartButton } from '@/features/cart/components/AddToCartButton';
import { QuantityStepper } from '@/features/cart/components/QuantityStepper';
import { Price } from '@/features/currency/components/Price';
import type { CartProduct } from '@/interfaces/cart.interface';
import type { ProductVariant } from '@/interfaces/catalog.interface';
import { cx } from '@/utils/cx.util';
import { pickLocalized } from '@/utils/localized-text.util';
import { defaultVariant, variantLabel } from '@/utils/product.util';

import './ProductPurchase.css';

interface ProductPurchaseProps {
  product: CartProduct;
  variants: readonly ProductVariant[];
}

/** Price box, variant chips, quantity and the buy buttons for the chosen variant. */
export const ProductPurchase = ({ product, variants }: ProductPurchaseProps): ReactElement => {
  const t = useTranslations('product');
  const locale = useLocale();
  const [sku, setSku] = useState(() => defaultVariant(variants)?.sku);
  const [quantity, setQuantity] = useState(1);
  const variant = variants.find((candidate) => candidate.sku === sku);
  if (variant === undefined) return <p className="product-purchase__stock">{t('unavailable')}</p>;
  const choose = (next: string): void => {
    setSku(next);
    setQuantity(1);
  };
  return (
    <div className="product-purchase">
      <div className="product-purchase__price-box">
        <Price className="product-purchase__price" usdCents={variant.priceUsdCents} isLarge />
      </div>
      {variants.length > 1 && (
        <fieldset className="product-purchase__row product-purchase__variants">
          <legend className="product-purchase__label">{t('variant')}</legend>
          <div className="product-purchase__chips">
            {variants.map((candidate) => (
              <label key={candidate.sku} className="product-purchase__option">
                <input
                  className="product-purchase__input visually-hidden"
                  type="radio"
                  name="variant"
                  value={candidate.sku}
                  checked={candidate.sku === sku}
                  disabled={candidate.stock === 0}
                  onChange={() => choose(candidate.sku)}
                />
                {pickLocalized(variantLabel(candidate), locale)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="product-purchase__row">
        <span className="product-purchase__label">{t('quantity')}</span>
        <div className="product-purchase__quantity">
          {variant.stock > 0 && (
            <QuantityStepper
              value={quantity}
              min={1}
              max={variant.stock}
              label={pickLocalized(product.title, locale)}
              onChange={setQuantity}
            />
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
        </div>
      </div>
      <AddToCartButton product={product} variant={variant} quantity={quantity} />
    </div>
  );
};
