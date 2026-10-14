import type {
  CreateProductRequest,
  ProductFormValues,
  SellerProduct,
} from '@/interfaces/product.interface';

import { centsToDollars, dollarsToCents } from './money.util';

const localizedColour = (
  attributes: Record<string, unknown> | null,
): { en: string; vi: string } => {
  const colour = attributes?.colour;
  if (colour !== null && typeof colour === 'object') {
    const { en, vi } = colour as { en?: unknown; vi?: unknown };
    return { en: typeof en === 'string' ? en : '', vi: typeof vi === 'string' ? vi : '' };
  }
  return { en: '', vi: '' };
};

export const emptyProductForm = (): ProductFormValues => ({
  titleEn: '',
  titleVi: '',
  descriptionEn: '',
  descriptionVi: '',
  categoryId: '',
  variants: [{ sku: '', price: '', stock: 0, colourEn: '', colourVi: '' }],
});

export const productToForm = (product: SellerProduct): ProductFormValues => ({
  titleEn: product.title.en,
  titleVi: product.title.vi ?? '',
  descriptionEn: product.description.en,
  descriptionVi: product.description.vi ?? '',
  categoryId: product.categoryId,
  variants: product.variants.map((variant) => {
    const colour = localizedColour(variant.attributes);
    return {
      sku: variant.sku,
      price: centsToDollars(variant.priceUsdCents),
      stock: variant.stock,
      colourEn: colour.en,
      colourVi: colour.vi,
    };
  }),
});

/** Form → API body: optional Vietnamese left out when empty, dollars → cents, colour as { en, vi }. */
export const formToRequest = (values: ProductFormValues): CreateProductRequest => {
  const optional = (value: string): string | undefined =>
    value.trim() === '' ? undefined : value.trim();
  return {
    title: { en: values.titleEn.trim(), vi: optional(values.titleVi) },
    description: { en: values.descriptionEn.trim(), vi: optional(values.descriptionVi) },
    categoryId: values.categoryId,
    attributes: null,
    variants: values.variants.map((variant) => ({
      sku: variant.sku.trim().toUpperCase(),
      priceUsdCents: dollarsToCents(variant.price) ?? 0,
      stock: Number(variant.stock),
      attributes:
        variant.colourEn.trim() === ''
          ? null
          : {
              colour: {
                en: variant.colourEn.trim(),
                vi: optional(variant.colourVi) ?? variant.colourEn.trim(),
              },
            },
    })),
  };
};
