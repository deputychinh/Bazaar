import type { Page, SellerApplicationStatus } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { SellerApplication } from '../../../interfaces/seller-application.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { SellerApplicationMapper } from '../mappers/seller-application.mapper.js';

import {
  type ListApplicationsOptions,
  type ReviewOptions,
  SellerApplicationsRepository,
} from './seller-applications.repository.js';

@Injectable()
export class PrismaSellerApplicationsRepository extends SellerApplicationsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async create(
    userId: string,
    shopName: string,
    status: SellerApplicationStatus,
  ): Promise<SellerApplication> {
    const row = await this.prisma.sellerApplication.create({ data: { userId, shopName, status } });
    return SellerApplicationMapper.toDomain(row);
  }

  public async findById(id: string): Promise<SellerApplication | null> {
    const row = await this.prisma.sellerApplication.findUnique({ where: { id } });
    return row === null ? null : SellerApplicationMapper.toDomain(row);
  }

  public async findByUser(userId: string): Promise<SellerApplication[]> {
    const rows = await this.prisma.sellerApplication.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
    });
    return rows.map((row) => SellerApplicationMapper.toDomain(row));
  }

  /** Keyset pagination, newest first (UUID v7 ids sort by creation time). */
  public async list(options: ListApplicationsOptions): Promise<Page<SellerApplication>> {
    const rows = await this.prisma.sellerApplication.findMany({
      where: {
        ...(options.status === undefined ? {} : { status: options.status }),
        ...(options.cursor === undefined ? {} : { id: { lt: options.cursor } }),
      },
      orderBy: { id: 'desc' },
      take: options.limit + 1,
    });
    const items = rows.slice(0, options.limit).map((row) => SellerApplicationMapper.toDomain(row));
    return { items, nextCursor: rows.length > options.limit ? (items.at(-1)?.id ?? null) : null };
  }

  public async review(
    id: string,
    review: ReviewOptions,
    transaction: Transaction,
  ): Promise<SellerApplication> {
    const row = await transaction.sellerApplication.update({ where: { id }, data: review });
    return SellerApplicationMapper.toDomain(row);
  }
}
