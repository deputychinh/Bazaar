'use client';

import { useTranslations } from 'next-intl';
import { useState, type ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { Link } from '@/i18n/navigation';
import type { CartProduct } from '@/interfaces/cart.interface';
import type { ProductVariant } from '@/interfaces/catalog.interface';
import { variantLabel } from '@/utils/product.util';

import { useCart } from '../useCart';

import './AddToCartButton.css';

interface AddToCartButtonProps {
  product: CartProduct;
  variant: ProductVariant;
}

export const AddToCartButton = ({ product, variant }: AddToCartButtonProps): ReactElement => {
  const t = useTranslations('cart');
  const { add, isReady } = useCart();
  const [addedSku, setAddedSku] = useState<string | null>(null);
  const isOut = variant.stock === 0;
  const handleAdd = (): void => {
    add(
      {
        ...product,
        sku: variant.sku,
        variantLabel: variantLabel(variant),
        unitPriceUsdCents: variant.priceUsdCents,
        maxQuantity: variant.stock,
      },
      1,
    );
    setAddedSku(variant.sku);
  };
  return (
    <div className="add-to-cart-button">
      <Button isFullWidth disabled={!isReady || isOut} onClick={handleAdd}>
        {isOut ? t('soldOut') : t('add')}
      </Button>
      <p className="add-to-cart-button__status" role="status">
        {addedSku === variant.sku && (
          <>
            {t('added')} <Link href="/cart">{t('view')}</Link>
          </>
        )}
      </p>
    </div>
  );
};
