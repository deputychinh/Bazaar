import { ProductStatus } from '@bazaar/contracts';
import { NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { ProductSort } from '../../../enums/product-sort.enum.js';
import type { Product, ProductPage } from '../../../interfaces/product.interface.js';
import type { Shop } from '../../../interfaces/shop.interface.js';
import { CategoriesService } from '../../categories/services/categories.service.js';
import { ShopsRepository } from '../../shops/repositories/shops.repository.js';
import type { ListProductsQuery } from '../dto/product.dto.js';
import { ProductsRepository } from '../repositories/products.repository.js';

/** Public catalog: browse, filter, search and read products (plan F2, F3). */
@Injectable()
export class ProductQueryService {
  public constructor(
    private readonly products: ProductsRepository,
    private readonly categories: CategoriesService,
    private readonly shops: ShopsRepository,
  ) {}

  public async list(query: ListProductsQuery): Promise<ProductPage> {
    const empty: ProductPage = { items: [], total: 0, page: query.page, pageSize: query.pageSize };
    let categoryIds: string[] | undefined;
    let shopId: string | undefined;
    try {
      categoryIds =
        query.category === undefined ? undefined : await this.categories.idsForSlug(query.category);
    } catch (error) {
      if (error instanceof NotFoundError) return empty;
      throw error;
    }
    if (query.shop !== undefined) {
      const shop = await this.shops.findBySlug(query.shop);
      if (shop === null) return empty;
      shopId = shop.id;
    }
    return this.products.search({
      text: query.q,
      categoryIds,
      shopId,
      minPriceUsdCents: query.minPrice,
      maxPriceUsdCents: query.maxPrice,
      minRating: query.minRating,
      sort: query.sort ?? (query.q === undefined ? ProductSort.Newest : ProductSort.Relevance),
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  public async bySlug(slug: string): Promise<{ product: Product; shop: Shop }> {
    const product = await this.products.findBySlug(slug);
    const shop = product === null ? null : await this.shops.findById(product.shopId);
    if (product?.status !== ProductStatus.Published || shop === null) {
      throw new NotFoundError('Product', slug);
    }
    return { product, shop };
  }
}
