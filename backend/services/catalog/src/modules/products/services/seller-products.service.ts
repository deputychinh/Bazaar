import { EventType, ProductStatus } from '@bazaar/contracts';
import { CacheStore, Clock, ConflictError, NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import { TransactionManager } from '../../../common/transaction/transaction-manager.js';
import { ProductAction } from '../../../enums/product-action.enum.js';
import type { Product, ProductPage } from '../../../interfaces/product.interface.js';
import { CacheKeyUtil } from '../../../utils/cache-key.util.js';
import { SlugUtil } from '../../../utils/slug.util.js';
import { CategoriesService } from '../../categories/services/categories.service.js';
import { ShopsRepository } from '../../shops/repositories/shops.repository.js';
import { ProductRules } from '../domain/product-rules.js';
import { ProductStateMachine } from '../domain/product-state-machine.js';
import type {
  CreateProductDto,
  SellerProductsQuery,
  UpdateProductDto,
} from '../dto/seller-product.dto.js';
import { ProductsRepository } from '../repositories/products.repository.js';

import { ProductEvents } from './product-events.js';

/** A seller's own products: create, edit, publish, unpublish (plan F8, FR-07). */
@Injectable()
export class SellerProductsService {
  public constructor(
    private readonly products: ProductsRepository,
    private readonly shops: ShopsRepository,
    private readonly categories: CategoriesService,
    private readonly events: ProductEvents,
    private readonly transactions: TransactionManager,
    private readonly cache: CacheStore,
    private readonly clock: Clock,
  ) {}

  public list(sellerId: string, query: SellerProductsQuery): Promise<ProductPage> {
    return this.products.findBySeller({ sellerId, ...query });
  }

  public async get(sellerId: string, productId: string): Promise<Product> {
    const product = await this.products.findById(productId);
    // Someone else's product looks exactly like a missing one.
    if (product?.sellerId !== sellerId) {
      throw new NotFoundError('Product', productId);
    }
    return product;
  }

  public async create(sellerId: string, request: CreateProductDto): Promise<Product> {
    const shop = await this.shops.findBySellerId(sellerId);
    if (shop === null) {
      throw new ConflictError('Your shop is still being set up, please try again in a moment');
    }
    await this.categories.assertExists(request.categoryId);
    const summary = ProductRules.summarize(request.variants);
    const slug = await SlugUtil.unique(
      SlugUtil.from(request.title.en),
      async (candidate) => (await this.products.findBySlug(candidate)) !== null,
    );
    const changed = await this.transactions.run((transaction) =>
      this.products.create(
        { ...request, ...summary, shopId: shop.id, sellerId, slug, status: ProductStatus.Draft },
        transaction,
      ),
    );
    // After commit: the public page must not show stale data.
    await this.cache.delete(CacheKeyUtil.productDetail(changed.slug));
    return changed;
  }

  public async update(
    sellerId: string,
    productId: string,
    changes: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.get(sellerId, productId);
    if (changes.categoryId !== undefined) {
      await this.categories.assertExists(changes.categoryId);
    }
    const summary = changes.variants === undefined ? {} : ProductRules.summarize(changes.variants);
    const changed = await this.transactions.run(async (transaction) => {
      const updated = await this.products.update(
        product.id,
        { ...changes, ...summary },
        transaction,
      );
      if (ProductStateMachine.isPublic(updated.status)) {
        await this.events.record(EventType.ProductUpdated, updated, transaction);
      }
      return updated;
    });
    // After commit: the public page must not show stale data.
    await this.cache.delete(CacheKeyUtil.productDetail(changed.slug));
    return changed;
  }

  public async publish(sellerId: string, productId: string): Promise<Product> {
    const product = await this.get(sellerId, productId);
    const status = ProductStateMachine.transition(product.status, ProductAction.Publish);
    const changed = await this.transactions.run(async (transaction) => {
      const published = await this.products.update(
        product.id,
        { status, publishedAt: this.clock.now() },
        transaction,
      );
      await this.events.record(EventType.ProductPublished, published, transaction);
      return published;
    });
    // After commit: the public page must not show stale data.
    await this.cache.delete(CacheKeyUtil.productDetail(changed.slug));
    return changed;
  }

  public async unpublish(sellerId: string, productId: string): Promise<Product> {
    const product = await this.get(sellerId, productId);
    const status = ProductStateMachine.transition(product.status, ProductAction.Unpublish);
    const changed = await this.transactions.run(async (transaction) => {
      const draft = await this.products.update(product.id, { status }, transaction);
      await this.events.record(EventType.ProductHidden, draft, transaction);
      return draft;
    });
    // After commit: the public page must not show stale data.
    await this.cache.delete(CacheKeyUtil.productDetail(changed.slug));
    return changed;
  }
}
