import { ValidationError } from '@bazaar/nest-common';

import { MAX_VARIANTS_PER_PRODUCT } from '../../../constants/catalog.constant.js';
import type { ProductVariant } from '../../../interfaces/product.interface.js';

/** Derived product fields and variant rules, kept in one pure place. */
export class ProductRules {
  /** Cheapest price and total stock, stored for filtering and sorting. */
  public static summarize(variants: readonly ProductVariant[]): {
    minPriceUsdCents: number;
    totalStock: number;
  } {
    if (variants.length === 0 || variants.length > MAX_VARIANTS_PER_PRODUCT) {
      throw new ValidationError(
        `A product needs between 1 and ${MAX_VARIANTS_PER_PRODUCT} variants`,
      );
    }
    const skus = variants.map((variant) => variant.sku);
    const duplicate = skus.find((sku, index) => skus.indexOf(sku) !== index);
    if (duplicate !== undefined) {
      throw new ValidationError(`SKU ${duplicate} is used twice in this product`, {
        sku: duplicate,
      });
    }
    return {
      minPriceUsdCents: Math.min(...variants.map((variant) => variant.priceUsdCents)),
      totalStock: variants.reduce((total, variant) => total + variant.stock, 0),
    };
  }
}
