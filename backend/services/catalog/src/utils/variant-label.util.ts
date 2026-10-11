import type { LocalizedText } from '@bazaar/contracts';

import type { ProductVariant } from '../interfaces/product.interface.js';

/**
 * Human label of a variant from its attribute values, in both languages ("Indigo / M" ·
 * "Chàm / M"). Values may be plain (size "M") or localized ({ en, vi }); falls back to the SKU.
 */
export class VariantLabelUtil {
  public static of(variant: ProductVariant): LocalizedText {
    const parts = Object.values(variant.attributes ?? {}).flatMap((value) =>
      VariantLabelUtil.part(value),
    );
    if (parts.length === 0) return { en: variant.sku, vi: variant.sku };
    return {
      en: parts.map((part) => part.en).join(' / '),
      vi: parts.map((part) => part.vi ?? part.en).join(' / '),
    };
  }

  private static part(value: unknown): LocalizedText[] {
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
  }
}
