import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { StarRating } from '@/components/StarRating/StarRating';
import { IconName } from '@/enums/icon-name.enum';
import { ProductReviews } from '@/features/reviews/components/ProductReviews';
import { Link } from '@/i18n/navigation';
import type { Category, ProductDetail } from '@/interfaces/catalog.interface';
import { formatCompactCount } from '@/utils/count.util';
import { pickLocalized } from '@/utils/localized-text.util';
import { attributeName, attributeRows, isTranslatedAttribute } from '@/utils/product.util';

import { ProductGallery } from './ProductGallery';
import { ProductPurchase } from './ProductPurchase';

import './ProductView.css';

interface ProductViewProps {
  product: ProductDetail;
  category?: Category;
}

/** Product page: gallery and buy box, the shop card, specifications, description, reviews. */
export const ProductView = ({ product, category }: ProductViewProps): ReactElement => {
  const t = useTranslations('product');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const title = pickLocalized(product.title, locale);
  const images = product.images.map((image) => ({
    url: image.url,
    alt: image.alt === null ? title : pickLocalized(image.alt, locale),
  }));
  const totalStock = product.variants.reduce((total, variant) => total + variant.stock, 0);
  return (
    <main id="main" className="product-view page container">
      <nav className="product-view__breadcrumbs" aria-label={t('breadcrumbs')}>
        <ol className="product-view__crumbs">
          <li className="product-view__crumb">
            <Link className="product-view__crumb-link" href="/">
              {tNav('home')}
            </Link>
          </li>
          {category !== undefined && (
            <li className="product-view__crumb">
              <Link className="product-view__crumb-link" href={`/c/${category.slug}`}>
                {pickLocalized(category.name, locale)}
              </Link>
            </li>
          )}
          <li className="product-view__crumb" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>
      <div className="product-view__body panel">
        <ProductGallery images={images} />
        <div className="product-view__info">
          <h1 className="product-view__title">{title}</h1>
          <div className="product-view__stats">
            {product.rating.count > 0 && (
              <>
                <span className="product-view__stat">
                  <span className="product-view__stat-value product-view__stat-value--brand">
                    {product.rating.average.toFixed(1)}
                  </span>
                  <StarRating
                    average={product.rating.average}
                    label={t('ratingLabel', {
                      average: product.rating.average,
                      count: product.rating.count,
                    })}
                  />
                </span>
                <span className="product-view__stat">
                  <span className="product-view__stat-value">
                    {formatCompactCount(product.rating.count, locale)}
                  </span>
                  {t('ratings')}
                </span>
              </>
            )}
            <span className="product-view__stat">
              {t('sold', { count: formatCompactCount(product.soldCount, locale) })}
            </span>
          </div>
          <ProductPurchase
            product={{
              productSlug: product.slug,
              title: product.title,
              imageUrl: product.imageUrl,
              shop: product.shop,
            }}
            variants={product.variants}
          />
        </div>
      </div>
      <section className="product-view__shop panel" aria-label={t('shopLabel')}>
        <span className="product-view__avatar" aria-hidden="true">
          {product.shop.name.charAt(0)}
        </span>
        <div className="product-view__shop-info">
          <Link className="product-view__shop-name" href={`/s/${product.shop.slug}`}>
            {product.shop.name}
          </Link>
          <span className="product-view__shop-note">{t('shopNote')}</span>
        </div>
        <Link className="button button--secondary button--small" href={`/s/${product.shop.slug}`}>
          <Icon name={IconName.Store} />
          {t('viewShop')}
        </Link>
      </section>
      <section className="panel" aria-labelledby="product-specs">
        <div className="panel__head">
          <h2 id="product-specs" className="panel__title">
            {t('specifications')}
          </h2>
        </div>
        <dl className="product-view__specs panel__body">
          {category !== undefined && (
            <div className="product-view__spec">
              <dt className="product-view__spec-name">{t('category')}</dt>
              <dd className="product-view__spec-value">{pickLocalized(category.name, locale)}</dd>
            </div>
          )}
          {attributeRows(product.attributes).map((row) => (
            <div key={row.key} className="product-view__spec">
              <dt className="product-view__spec-name">
                {isTranslatedAttribute(row.key)
                  ? t(`attributes.${row.key}`)
                  : attributeName(row.key)}
              </dt>
              <dd className="product-view__spec-value">{pickLocalized(row.value, locale)}</dd>
            </div>
          ))}
          <div className="product-view__spec">
            <dt className="product-view__spec-name">{t('stock')}</dt>
            <dd className="product-view__spec-value">{totalStock}</dd>
          </div>
        </dl>
        <div className="panel__head">
          <h2 className="panel__title">{t('description')}</h2>
        </div>
        <p className="product-view__description panel__body">
          {pickLocalized(product.description, locale)}
        </p>
      </section>
      <div className="panel panel__body">
        <ProductReviews slug={product.slug} />
      </div>
    </main>
  );
};
