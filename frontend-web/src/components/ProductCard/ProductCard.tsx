import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { StarRating } from '@/components/StarRating/StarRating';
import { PRODUCT_CARD_SIZES } from '@/constants/catalog.constant';
import { IconName } from '@/enums/icon-name.enum';
import { Price } from '@/features/currency/components/Price';
import { Link } from '@/i18n/navigation';
import type { ProductSummary } from '@/interfaces/catalog.interface';
import { formatCompactCount } from '@/utils/count.util';
import { pickLocalized } from '@/utils/localized-text.util';

import './ProductCard.css';

interface ProductCardProps {
  product: ProductSummary;
  /** Above-the-fold cards load their image first (LCP). */
  isPriority?: boolean;
  /** Corner ribbon, e.g. "TOP" in the best-seller row. */
  ribbon?: ReactNode;
}

/** Marketplace tile: square image, two-line title, price in brand colour, stars and units sold. */
export const ProductCard = ({
  product,
  isPriority = false,
  ribbon,
}: ProductCardProps): ReactElement => {
  const t = useTranslations('product');
  const locale = useLocale();
  const title = pickLocalized(product.title, locale);
  return (
    <article className="product-card">
      <Link className="product-card__link" href={`/p/${product.slug}`}>
        <div className="product-card__media">
          {product.imageUrl === null ? (
            <div className="product-card__placeholder" aria-hidden="true">
              <Icon name={IconName.Box} />
            </div>
          ) : (
            <Image
              className="product-card__image"
              src={product.imageUrl}
              alt=""
              fill
              sizes={PRODUCT_CARD_SIZES}
              priority={isPriority}
            />
          )}
          {ribbon !== undefined && <span className="product-card__ribbon">{ribbon}</span>}
          {!product.inStock && <span className="product-card__sold-out">{t('outOfStock')}</span>}
        </div>
        <div className="product-card__body">
          <h3 className="product-card__title">{title}</h3>
          <Price className="product-card__price" usdCents={product.minPriceUsdCents} />
          <div className="product-card__meta">
            {product.rating.count > 0 ? (
              <StarRating
                average={product.rating.average}
                label={t('ratingLabel', {
                  average: product.rating.average,
                  count: product.rating.count,
                })}
              />
            ) : (
              <span />
            )}
            {product.soldCount > 0 && (
              <span className="product-card__sold">
                {t('sold', { count: formatCompactCount(product.soldCount, locale) })}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
};
