import { useLocale, useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Link } from '@/i18n/navigation';
import type { Category, ProductDetail } from '@/interfaces/catalog.interface';
import { pickLocalized } from '@/utils/localized-text.util';

import { ProductGallery } from './ProductGallery';
import { ProductPurchase } from './ProductPurchase';

import './ProductView.css';

interface ProductViewProps {
  product: ProductDetail;
  category?: Category;
}

export const ProductView = ({ product, category }: ProductViewProps): ReactElement => {
  const t = useTranslations('product');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const title = pickLocalized(product.title, locale);
  const images = product.images.map((image) => ({
    url: image.url,
    alt: image.alt === null ? title : pickLocalized(image.alt, locale),
  }));
  return (
    <main id="main" className="product-view container">
      <nav className="product-view__breadcrumbs" aria-label={t('breadcrumbs')}>
        <ol className="product-view__crumbs">
          <li className="product-view__crumb">
            <Link href="/">{tNav('home')}</Link>
          </li>
          {category !== undefined && (
            <li className="product-view__crumb">
              <Link href={`/c/${category.slug}`}>{pickLocalized(category.name, locale)}</Link>
            </li>
          )}
          <li className="product-view__crumb" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>
      <div className="product-view__body">
        <ProductGallery images={images} />
        <div className="product-view__info stack">
          <h1 className="product-view__title">{title}</h1>
          <p className="product-view__shop">
            {t.rich('soldBy', {
              shop: () => <Link href={`/s/${product.shop.slug}`}>{product.shop.name}</Link>,
            })}
          </p>
          {product.rating.count > 0 && (
            <p className="product-view__rating">
              ★ {product.rating.average.toFixed(1)} ·{' '}
              {t('ratingLabel', { average: product.rating.average, count: product.rating.count })}
            </p>
          )}
          <ProductPurchase variants={product.variants} />
          <section className="product-view__description">
            <h2 className="product-view__heading">{t('description')}</h2>
            <p>{pickLocalized(product.description, locale)}</p>
          </section>
        </div>
      </div>
    </main>
  );
};
