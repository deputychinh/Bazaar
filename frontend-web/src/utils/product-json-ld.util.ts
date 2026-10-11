import { CENTS_PER_USD } from '@/constants/currency.constant';
import type { JsonLd, ProductJsonLdOptions } from '@/interfaces/json-ld.interface';

import { pickLocalized } from './localized-text.util';

const availability = (stock: number): string =>
  stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';

/**
 * schema.org Product for rich results. Prices are the stored USD amounts — the VND figure on
 * screen is an estimate, so search engines only ever see the price the order is charged in.
 */
export const productJsonLd = ({ product, locale, url }: ProductJsonLdOptions): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: pickLocalized(product.title, locale),
  description: pickLocalized(product.description, locale),
  image: product.images.map((image) => image.url),
  sku: product.variants[0]?.sku,
  brand: { '@type': 'Brand', name: product.shop.name },
  offers: product.variants.map((variant) => ({
    '@type': 'Offer',
    sku: variant.sku,
    url,
    priceCurrency: 'USD',
    price: (variant.priceUsdCents / CENTS_PER_USD).toFixed(2),
    availability: availability(variant.stock),
    seller: { '@type': 'Organization', name: product.shop.name },
  })),
  ...(product.rating.count > 0 && {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating.average,
      reviewCount: product.rating.count,
    },
  }),
});

/** JSON for an inline script: `<` is escaped so text from sellers cannot close the tag. */
export const serializeJsonLd = (data: JsonLd): string =>
  JSON.stringify(data).replaceAll('<', '\\u003c');
