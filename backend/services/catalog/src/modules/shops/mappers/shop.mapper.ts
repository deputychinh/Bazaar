import { ShopStatus } from '@bazaar/contracts';
import { EnumUtil } from '@bazaar/nest-common';

import type { Shop as ShopRow } from '#prisma';

import type { Shop } from '../../../interfaces/shop.interface.js';
import type { ShopResponse } from '../dto/shop.dto.js';

export class ShopMapper {
  public static toDomain(row: ShopRow): Shop {
    return {
      id: row.id,
      sellerId: row.sellerId,
      slug: row.slug,
      name: row.name,
      description:
        row.description === null
          ? null
          : { en: row.description.en, vi: row.description.vi ?? undefined },
      status: EnumUtil.parse(ShopStatus, row.status),
      createdAt: row.createdAt,
    };
  }

  public static toResponse(shop: Shop): ShopResponse {
    return {
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      description: shop.description,
      status: shop.status,
      createdAt: shop.createdAt.toISOString(),
    };
  }
}
