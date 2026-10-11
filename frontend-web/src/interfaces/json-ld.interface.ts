import type { Locale } from '@/api/gateway.schema';

import type { ProductDetail } from './catalog.interface';

/** A schema.org object serialised into a `<script type="application/ld+json">`. */
export type JsonLd = Record<string, unknown>;

export interface ProductJsonLdOptions {
  product: ProductDetail;
  locale: Locale;
  /** Absolute canonical URL of the product page. */
  url: string;
}
