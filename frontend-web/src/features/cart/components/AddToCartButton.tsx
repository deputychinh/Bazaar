'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { IconName } from '@/enums/icon-name.enum';
import { Link, useRouter } from '@/i18n/navigation';
import type { CartProduct } from '@/interfaces/cart.interface';
import type { ProductVariant } from '@/interfaces/catalog.interface';
import { variantLabel } from '@/utils/product.util';

import { useCart } from '../useCart';

import './AddToCartButton.css';

interface AddToCartButtonProps {
  product: CartProduct;
  variant: ProductVariant;
  quantity?: number;
}

/** "Add to cart" beside "Buy now" (adds, then opens the cart), like marketplace product pages. */
export const AddToCartButton = ({
  product,
  variant,
  quantity = 1,
}: AddToCartButtonProps): ReactElement => {
  const t = useTranslations('cart');
  const router = useRouter();
  const { add, isReady } = useCart();
  const [addedSku, setAddedSku] = useState<string | null>(null);
  const isOut = variant.stock === 0;
  const addToCart = (): void => {
    add(
      {
        ...product,
        sku: variant.sku,
        variantLabel: variantLabel(variant),
        unitPriceUsdCents: variant.priceUsdCents,
        maxQuantity: variant.stock,
      },
      quantity,
    );
    setAddedSku(variant.sku);
  };
  const buyNow = (): void => {
    addToCart();
    router.push('/cart');
  };
  return (
    <div className="add-to-cart-button">
      {isOut ? (
        <button className="button button--large add-to-cart-button__action" type="button" disabled>
          {t('soldOut')}
        </button>
      ) : (
        <div className="add-to-cart-button__actions">
          <button
            className="button button--secondary button--large add-to-cart-button__action"
            type="button"
            disabled={!isReady}
            onClick={addToCart}
          >
            <Icon name={IconName.Cart} />
            {t('add')}
          </button>
          <button
            className="button button--primary button--large add-to-cart-button__action"
            type="button"
            disabled={!isReady}
            onClick={buyNow}
          >
            {t('buyNow')}
          </button>
        </div>
      )}
      <p className="add-to-cart-button__status" role="status">
        {addedSku === variant.sku && (
          <>
            <Icon name={IconName.Check} /> {t('added')} <Link href="/cart">{t('view')}</Link>
          </>
        )}
      </p>
    </div>
  );
};
