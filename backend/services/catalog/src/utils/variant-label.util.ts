import type { ProductVariant } from '../interfaces/product.interface.js';

/** Human label of a variant from its attribute values ("Blue / M"), or its SKU when it has none. */
export class VariantLabelUtil {
  public static of(variant: ProductVariant): string {
    const values = Object.values(variant.attributes ?? {}).filter(
      (value): value is string | number => typeof value === 'string' || typeof value === 'number',
    );
    return values.length === 0 ? variant.sku : values.join(' / ');
  }
}
