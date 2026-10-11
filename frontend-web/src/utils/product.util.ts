import type { ProductVariant } from '@/interfaces/catalog.interface';
import type { LocalizedText } from '@/interfaces/localized-text.interface';

const part = (value: unknown): LocalizedText[] => {
  if (typeof value === 'string' || typeof value === 'number') {
    return [{ en: String(value), vi: String(value) }];
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as { en?: unknown }).en === 'string'
  ) {
    const { en, vi } = value as { en: string; vi?: unknown };
    return [{ en, vi: typeof vi === 'string' && vi !== '' ? vi : en }];
  }
  return [];
};

/**
 * Label of a variant in both languages from its attribute values ("Indigo / M" · "Chàm / M");
 * values may be plain or localized. Falls back to the SKU. Mirrors the catalog's label.
 */
export const variantLabel = (variant: ProductVariant): LocalizedText => {
  const parts = Object.values(variant.attributes ?? {}).flatMap(part);
  if (parts.length === 0) return { en: variant.sku, vi: variant.sku };
  return {
    en: parts.map((label) => label.en).join(' / '),
    vi: parts.map((label) => label.vi ?? label.en).join(' / '),
  };
};

/** The first variant a buyer can order, so the page opens on something purchasable. */
export const defaultVariant = (variants: readonly ProductVariant[]): ProductVariant | undefined =>
  variants.find((variant) => variant.stock > 0) ?? variants[0];
