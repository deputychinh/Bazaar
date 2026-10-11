import { ProductStatus } from '@bazaar/contracts';
import { CacheStore, NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { PRODUCT_DETAIL_TTL_SECONDS } from '../../../constants/cache.constant.js';
import { ProductSort } from '../../../enums/product-sort.enum.js';
import type { ProductPage } from '../../../interfaces/product.interface.js';
import { CacheKeyUtil } from '../../../utils/cache-key.util.js';
import { CategoriesService } from '../../categories/services/categories.service.js';
import { ShopsRepository } from '../../shops/repositories/shops.repository.js';
import type { ListProductsQuery, ProductDetail } from '../dto/product.dto.js';
import { ProductsRepository } from '../repositories/products.repository.js';

import { ProductPresenter } from './product-presenter.js';

/** Public catalog: browse, filter, search and read products (plan F2, F3). */
@Injectable()
export class ProductQueryService {
  public constructor(
    private readonly products: ProductsRepository,
    private readonly categories: CategoriesService,
    private readonly shops: ShopsRepository,
    private readonly presenter: ProductPresenter,
    private readonly cache: CacheStore,
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

  /** Public product page, cached for a few minutes and dropped whenever the product changes. */
  public detail(slug: string): Promise<ProductDetail> {
    return this.cache.getOrSet(
      CacheKeyUtil.productDetail(slug),
      PRODUCT_DETAIL_TTL_SECONDS,
      async () => {
        const product = await this.products.findBySlug(slug);
        const shop = product === null ? null : await this.shops.findById(product.shopId);
        if (product?.status !== ProductStatus.Published || shop === null) {
          throw new NotFoundError('Product', slug);
        }
        return this.presenter.detail(product, shop);
      },
    );
  }
}
