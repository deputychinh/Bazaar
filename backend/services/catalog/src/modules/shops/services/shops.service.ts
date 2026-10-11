import { ShopStatus, type SellerApprovedPayload } from '@bazaar/contracts';
import { NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { Shop } from '../../../interfaces/shop.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { SlugUtil } from '../../../utils/slug.util.js';
import type { UpdateShopDto } from '../dto/shop.dto.js';
import { ShopsRepository } from '../repositories/shops.repository.js';

@Injectable()
export class ShopsService {
  public constructor(private readonly shops: ShopsRepository) {}

  /** Opens the shop of a newly approved seller; does nothing if it already exists. */
  public async provisionForSeller(
    approval: SellerApprovedPayload,
    transaction: Transaction,
  ): Promise<Shop> {
    const existing = await this.shops.findBySellerId(approval.userId, transaction);
    if (existing !== null) {
      return existing;
    }
    const slug = await SlugUtil.unique(
      SlugUtil.from(approval.shopName),
      async (candidate) => (await this.shops.findBySlug(candidate)) !== null,
    );
    return this.shops.create(
      { sellerId: approval.userId, slug, name: approval.shopName, status: ShopStatus.Active },
      transaction,
    );
  }

  public async getPublic(slug: string): Promise<Shop> {
    const shop = await this.shops.findBySlug(slug);
    if (shop?.status !== ShopStatus.Active) {
      throw new NotFoundError('Shop', slug);
    }
    return shop;
  }

  public async getMine(sellerId: string): Promise<Shop> {
    const shop = await this.shops.findBySellerId(sellerId);
    if (shop === null) {
      throw new NotFoundError('Shop of seller', sellerId);
    }
    return shop;
  }

  public async updateMine(sellerId: string, changes: UpdateShopDto): Promise<Shop> {
    const shop = await this.getMine(sellerId);
    return this.shops.update(shop.id, changes);
  }
}
