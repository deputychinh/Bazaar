import type { ProductVariant } from '@/interfaces/catalog.interface';

/** Human label of a variant from its attributes ("Blue / M"), or its SKU when it has none. */
export const variantLabel = (variant: ProductVariant): string => {
  const values = Object.values(variant.attributes ?? {}).filter(
    (value): value is string | number => typeof value === 'string' || typeof value === 'number',
  );
  return values.length === 0 ? variant.sku : values.join(' / ');
};

/** The first variant a buyer can order, so the page opens on something purchasable. */
export const defaultVariant = (variants: readonly ProductVariant[]): ProductVariant | undefined =>
  variants.find((variant) => variant.stock > 0) ?? variants[0];
