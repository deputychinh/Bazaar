import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { PRODUCT_IMAGE_SIZES } from '@/constants/catalog.constant';
import { Price } from '@/features/currency/components/Price';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/interfaces/catalog.interface';
import { pickLocalized } from '@/utils/localized-text.util';

import './ProductCard.css';

interface ProductCardProps {
  product: ProductSummary;
  /** Above-the-fold cards load their image first (LCP). */
  isPriority?: boolean;
}

export const ProductCard = ({ product, isPriority = false }: ProductCardProps): ReactElement => {
  const t = useTranslations('product');
  const locale = useLocale();
  const title = pickLocalized(product.title, locale);
  return (
    <article className="product-card">
      <Link className="product-card__link" href={`/p/${product.slug}`}>
        <div className="product-card__media">
          {product.imageUrl === null ? (
            <div className="product-card__placeholder" aria-hidden="true" />
          ) : (
            <Image
              className="product-card__image"
              src={product.imageUrl}
              alt=""
              fill
              sizes={PRODUCT_IMAGE_SIZES}
              priority={isPriority}
            />
          )}
          {!product.inStock && <span className="product-card__badge">{t('outOfStock')}</span>}
        </div>
        <h3 className="product-card__title">{title}</h3>
      </Link>
      <div className="product-card__meta">
        <Price usdCents={product.minPriceUsdCents} />
        {product.rating.count > 0 && (
          <span
            className="product-card__rating"
            aria-label={t('ratingLabel', {
              average: product.rating.average,
              count: product.rating.count,
            })}
          >
            ★ {product.rating.average.toFixed(1)} · {product.rating.count}
          </span>
        )}
      </div>
    </article>
  );
};
