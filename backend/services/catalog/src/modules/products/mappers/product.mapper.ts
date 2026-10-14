import { ProductStatus } from '@bazaar/contracts';
import { EnumUtil } from '@bazaar/nest-common';

import type { Product as ProductRow } from '#prisma';

import type { Product } from '../../../interfaces/product.interface.js';

export class ProductMapper {
  public static toDomain(row: ProductRow): Product {
    return {
      id: row.id,
      shopId: row.shopId,
      sellerId: row.sellerId,
      slug: row.slug,
      title: { en: row.title.en, vi: row.title.vi ?? undefined },
      description: { en: row.description.en, vi: row.description.vi ?? undefined },
      categoryId: row.categoryId,
      attributes: ProductMapper.asRecord(row.attributes),
      variants: row.variants.map((variant) => ({
        sku: variant.sku,
        priceUsdCents: variant.priceUsdCents,
        stock: variant.stock,
        attributes: ProductMapper.asRecord(variant.attributes),
      })),
      images: row.images.map((image) => ({
        key: image.key,
        alt: image.alt === null ? null : { en: image.alt.en, vi: image.alt.vi ?? undefined },
      })),
      status: EnumUtil.parse(ProductStatus, row.status),
      minPriceUsdCents: row.minPriceUsdCents,
      totalStock: row.totalStock,
      rating: { average: row.rating.average, count: row.rating.count },
      soldCount: row.soldCount,
      hiddenReason: row.hiddenReason,
      publishedAt: row.publishedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private static asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }
}
