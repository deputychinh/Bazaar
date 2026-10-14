import { ProductStatus } from '@bazaar/contracts';
import { ConflictError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { Prisma } from '#prisma';

import { ProductSort } from '../../../enums/product-sort.enum.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type {
  ModerationCriteria,
  NewProduct,
  Product,
  ProductPage,
  ProductSearchCriteria,
  ProductVariant,
  SellerProductsCriteria,
} from '../../../interfaces/product.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';
import { ProductMapper } from '../mappers/product.mapper.js';

import { type ProductChangesOptions, ProductsRepository } from './products.repository.js';

const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class PrismaProductsRepository extends ProductsRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async search(criteria: ProductSearchCriteria): Promise<ProductPage> {
    return criteria.text === undefined ? this.browse(criteria) : this.textSearch(criteria);
  }

  public async findBySlug(slug: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { slug } });
    return row === null ? null : ProductMapper.toDomain(row);
  }

  public async findBySlugs(slugs: string[]): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({ where: { slug: { in: slugs } } });
    return rows.map((row) => ProductMapper.toDomain(row));
  }

  public async findById(id: string): Promise<Product | null> {
    const row = await this.prisma.product.findUnique({ where: { id } });
    return row === null ? null : ProductMapper.toDomain(row);
  }

  public async findBySeller(criteria: SellerProductsCriteria): Promise<ProductPage> {
    const where: Prisma.ProductWhereInput = {
      sellerId: criteria.sellerId,
      ...(criteria.status === undefined ? {} : { status: criteria.status }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: rows.map((row) => ProductMapper.toDomain(row)),
      total,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }

  public async findForModeration(criteria: ModerationCriteria): Promise<ProductPage> {
    const where: Prisma.ProductWhereInput = {
      ...(criteria.status === undefined ? {} : { status: criteria.status }),
      ...(criteria.q === undefined
        ? {}
        : { title: { is: { en: { contains: criteria.q, mode: 'insensitive' } } } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: rows.map((row) => ProductMapper.toDomain(row)),
      total,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }

  public async create(product: NewProduct, transaction: Transaction): Promise<Product> {
    return this.translateConflicts(async () =>
      ProductMapper.toDomain(
        await transaction.product.create({
          data: {
            ...product,
            attributes: (product.attributes ?? {}) as Prisma.InputJsonObject,
            variants: this.toVariantRows(product.variants),
            images: [],
            rating: { average: 0, count: 0 },
          },
        }),
      ),
    );
  }

  public async update(
    id: string,
    changes: ProductChangesOptions,
    transaction: Transaction,
  ): Promise<Product> {
    const { variants, images, attributes, ...rest } = changes;
    return this.translateConflicts(async () =>
      ProductMapper.toDomain(
        await transaction.product.update({
          where: { id },
          data: {
            ...rest,
            ...(attributes === undefined
              ? {}
              : { attributes: (attributes ?? {}) as Prisma.InputJsonObject }),
            ...(variants === undefined ? {} : { variants: { set: this.toVariantRows(variants) } }),
            ...(images === undefined
              ? {}
              : {
                  images: {
                    set: images.map((image) => ({ key: image.key, alt: image.alt ?? undefined })),
                  },
                }),
          },
        }),
      ),
    );
  }

  private toVariantRows(variants: readonly ProductVariant[]): Prisma.ProductVariantCreateInput[] {
    return variants.map((variant) => ({
      sku: variant.sku,
      priceUsdCents: variant.priceUsdCents,
      stock: variant.stock,
      attributes: (variant.attributes ?? undefined) as Prisma.InputJsonObject | undefined,
    }));
  }

  /** The unique index on variants.sku is the source of truth for SKU clashes. */
  private async translateConflicts<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictError('A SKU or slug in this product is already used by another product');
      }
      throw error;
    }
  }

  private async browse(criteria: ProductSearchCriteria): Promise<ProductPage> {
    const where = this.filters(criteria);
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [this.orderBy(criteria.sort), { id: 'asc' }],
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return {
      items: rows.map((row) => ProductMapper.toDomain(row)),
      total,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }

  /** $text needs a raw aggregation for relevance; it returns ids, then Prisma loads the documents. */
  private async textSearch(criteria: ProductSearchCriteria): Promise<ProductPage> {
    const match: Record<string, Prisma.InputJsonValue> = {
      $text: { $search: criteria.text ?? '' },
      status: ProductStatus.Published,
    };
    if (criteria.categoryIds !== undefined)
      match.categoryId = { $in: criteria.categoryIds.map((id) => ({ $oid: id })) };
    if (criteria.shopId !== undefined) match.shopId = { $oid: criteria.shopId };
    const price: Record<string, number> = {};
    if (criteria.minPriceUsdCents !== undefined) price.$gte = criteria.minPriceUsdCents;
    if (criteria.maxPriceUsdCents !== undefined) price.$lte = criteria.maxPriceUsdCents;
    if (Object.keys(price).length > 0) match.minPriceUsdCents = price;
    if (criteria.minRating !== undefined) match['rating.average'] = { $gte: criteria.minRating };
    const result = (await this.prisma.product.aggregateRaw({
      pipeline: [
        { $match: match },
        { $addFields: { score: { $meta: 'textScore' } } },
        { $sort: { ...this.rawSort(criteria.sort), _id: 1 } },
        {
          $facet: {
            ids: [
              { $skip: (criteria.page - 1) * criteria.pageSize },
              { $limit: criteria.pageSize },
              { $project: { _id: 1 } },
            ],
            total: [{ $count: 'value' }],
          },
        },
      ],
    })) as unknown as [{ ids: { _id: { $oid: string } }[]; total: { value: number }[] }];
    const facet = result[0];
    const ids = facet?.ids.map((row) => row._id.$oid) ?? [];
    const rows = await this.prisma.product.findMany({ where: { id: { in: ids } } });
    const byId = new Map(rows.map((row) => [row.id, ProductMapper.toDomain(row)]));
    return {
      items: ids.flatMap((id) => byId.get(id) ?? []),
      total: facet?.total[0]?.value ?? 0,
      page: criteria.page,
      pageSize: criteria.pageSize,
    };
  }

  private filters(criteria: ProductSearchCriteria): Prisma.ProductWhereInput {
    return {
      status: ProductStatus.Published,
      ...(criteria.categoryIds === undefined ? {} : { categoryId: { in: criteria.categoryIds } }),
      ...(criteria.shopId === undefined ? {} : { shopId: criteria.shopId }),
      minPriceUsdCents: { gte: criteria.minPriceUsdCents, lte: criteria.maxPriceUsdCents },
      ...(criteria.minRating === undefined
        ? {}
        : { rating: { is: { average: { gte: criteria.minRating } } } }),
    };
  }

  private orderBy(sort: ProductSort): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case ProductSort.PriceAsc:
        return { minPriceUsdCents: 'asc' };
      case ProductSort.PriceDesc:
        return { minPriceUsdCents: 'desc' };
      case ProductSort.Rating:
        return { rating: { average: 'desc' } };
      case ProductSort.Newest:
      case ProductSort.Relevance:
        return { publishedAt: 'desc' };
    }
  }

  private rawSort(sort: ProductSort): Record<string, 1 | -1> {
    switch (sort) {
      case ProductSort.PriceAsc:
        return { minPriceUsdCents: 1 };
      case ProductSort.PriceDesc:
        return { minPriceUsdCents: -1 };
      case ProductSort.Rating:
        return { 'rating.average': -1 };
      case ProductSort.Newest:
        return { publishedAt: -1 };
      case ProductSort.Relevance:
        return { score: -1 };
    }
  }
}
