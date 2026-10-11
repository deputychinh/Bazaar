import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { NewShop, Shop } from '../../../interfaces/shop.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { ShopMapper } from '../mappers/shop.mapper.js';

import { type ShopChangesOptions, ShopsRepository } from './shops.repository.js';

@Injectable()
export class PrismaShopsRepository extends ShopsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async findById(id: string): Promise<Shop | null> {
    const row = await this.prisma.shop.findUnique({ where: { id } });
    return row === null ? null : ShopMapper.toDomain(row);
  }

  public async findBySlug(slug: string): Promise<Shop | null> {
    const row = await this.prisma.shop.findUnique({ where: { slug } });
    return row === null ? null : ShopMapper.toDomain(row);
  }

  public async findBySellerId(sellerId: string, transaction?: Transaction): Promise<Shop | null> {
    const row = await (transaction ?? this.prisma).shop.findUnique({ where: { sellerId } });
    return row === null ? null : ShopMapper.toDomain(row);
  }

  public async create(shop: NewShop, transaction: Transaction): Promise<Shop> {
    return ShopMapper.toDomain(await transaction.shop.create({ data: shop }));
  }

  public async update(id: string, changes: ShopChangesOptions): Promise<Shop> {
    return ShopMapper.toDomain(await this.prisma.shop.update({ where: { id }, data: changes }));
  }
}
