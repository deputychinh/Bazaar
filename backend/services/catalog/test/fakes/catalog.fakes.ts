import { type AnyEventEnvelope, ProductStatus, UserRole } from '@bazaar/contracts';
import {
  type AuthenticatedUser,
  ConflictError,
  EnumUtil,
  ProcessedEventStore,
  TokenVerifier,
  UnauthenticatedError,
} from '@bazaar/nest-common';

import { ObjectStorage } from '../../src/common/storage/object-storage.js';
import { TransactionManager } from '../../src/common/transaction/transaction-manager.js';
import { AppConfig } from '../../src/config/app-config.js';
import { catalogEnvSchema } from '../../src/config/env.schema.js';
import { ProductSort } from '../../src/enums/product-sort.enum.js';
import type { Category } from '../../src/interfaces/category.interface.js';
import type {
  ModerationCriteria,
  NewProduct,
  Product,
  ProductPage,
  ProductSearchCriteria,
  SellerProductsCriteria,
} from '../../src/interfaces/product.interface.js';
import type {
  NewReview,
  RatingSummary,
  Review,
  ReviewPage,
} from '../../src/interfaces/review.interface.js';
import type { NewShop, Shop } from '../../src/interfaces/shop.interface.js';
import type { StockLine, StockReservation } from '../../src/interfaces/stock.interface.js';
import type { PresignedUpload, StoredObject } from '../../src/interfaces/storage.interface.js';
import type { Transaction } from '../../src/interfaces/transaction.interface.js';
import { CategoriesRepository } from '../../src/modules/categories/repositories/categories.repository.js';
import { EventOutbox } from '../../src/modules/outbox/event-outbox.js';
import {
  type ProductChangesOptions,
  ProductsRepository,
} from '../../src/modules/products/repositories/products.repository.js';
import { DuplicateReviewError } from '../../src/modules/reviews/errors/duplicate-review.error.js';
import { ReviewsRepository } from '../../src/modules/reviews/repositories/reviews.repository.js';
import {
  type ShopChangesOptions,
  ShopsRepository,
} from '../../src/modules/shops/repositories/shops.repository.js';
import { StockRepository } from '../../src/modules/stock/repositories/stock.repository.js';

export const NOW = new Date('2026-10-11T08:00:00.000Z');

export const testConfig = (): AppConfig =>
  new AppConfig(
    catalogEnvSchema.parse({
      CATALOG_DATABASE_URL: 'mongodb://test',
      REDIS_URL: 'redis://test',
      KAFKA_BROKERS: 'localhost:9094',
      STORAGE_ACCESS_KEY: 'key',
      STORAGE_SECRET_KEY: 'secret',
      STORAGE_PUBLIC_URL: 'https://cdn.bazaar.test/',
    }),
  );
export const NO_TRANSACTION = {} as Transaction;
/** Internal API key the test app accepts on @Internal() routes. */
export const TEST_INTERNAL_KEY = 'internal-test-key-0123456789abcdef';

/** Tokens in tests read "ROLE:userId", e.g. "SELLER:seller-1". */
export class FakeTokenVerifier extends TokenVerifier {
  public verify(token: string): Promise<AuthenticatedUser> {
    const [role, id] = token.split(':');
    if (role === undefined || id === undefined) {
      return Promise.reject(new UnauthenticatedError('bad test token'));
    }
    return Promise.resolve({
      id,
      email: `${id}@bazaar.test`,
      role: EnumUtil.parse(UserRole, role),
    });
  }
}

export const bearer = (role: UserRole, id: string): string => `Bearer ${role}:${id}`;

export class InMemoryProcessedEvents extends ProcessedEventStore<Transaction> {
  private readonly seen = new Set<string>();

  public async runOnce(
    eventId: string,
    work: (transaction: Transaction) => Promise<void>,
  ): Promise<boolean> {
    if (this.seen.has(eventId)) {
      return false;
    }
    await work(NO_TRANSACTION);
    this.seen.add(eventId);
    return true;
  }
}

export class InMemoryShopsRepository extends ShopsRepository {
  public readonly rows: Shop[] = [];

  public findById(id: string): Promise<Shop | null> {
    return Promise.resolve(this.rows.find((shop) => shop.id === id) ?? null);
  }

  public findBySlug(slug: string): Promise<Shop | null> {
    return Promise.resolve(this.rows.find((shop) => shop.slug === slug) ?? null);
  }

  public findBySellerId(sellerId: string): Promise<Shop | null> {
    return Promise.resolve(this.rows.find((shop) => shop.sellerId === sellerId) ?? null);
  }

  public create(shop: NewShop): Promise<Shop> {
    const row: Shop = {
      ...shop,
      id: `shop-${this.rows.length + 1}`,
      description: null,
      createdAt: NOW,
    };
    this.rows.push(row);
    return Promise.resolve(row);
  }

  public update(id: string, changes: ShopChangesOptions): Promise<Shop> {
    const row = this.rows.find((shop) => shop.id === id)!;
    Object.assign(row, changes);
    return Promise.resolve(row);
  }
}

export class RecordingOutbox extends EventOutbox {
  public readonly events: AnyEventEnvelope[] = [];

  public add(event: AnyEventEnvelope): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}

export class ImmediateTransactionManager extends TransactionManager {
  public run<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
    return work(NO_TRANSACTION);
  }
}

export const category = (
  overrides: Partial<Category> & Pick<Category, 'id' | 'slug' | 'path'>,
): Category => ({
  name: { en: overrides.slug, vi: overrides.slug },
  parentId: null,
  sortOrder: 0,
  ...overrides,
});

export class InMemoryCategoriesRepository extends CategoriesRepository {
  public constructor(public readonly rows: Category[] = []) {
    super();
  }

  public findAll(): Promise<Category[]> {
    return Promise.resolve([...this.rows]);
  }
}

export const productFixture = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  shopId: 'shop-1',
  sellerId: 'seller-1',
  slug: 'ceramic-vase-1',
  title: { en: 'Ceramic vase', vi: 'Bình hoa gốm' },
  description: { en: 'Hand-made', vi: 'Thủ công' },
  categoryId: 'cat-ceramics',
  attributes: null,
  variants: [{ sku: 'BZ-0001-1', priceUsdCents: 1500, stock: 3, attributes: null }],
  images: [{ key: 'products/p1/a.webp', alt: null }],
  status: ProductStatus.Published,
  minPriceUsdCents: 1500,
  totalStock: 3,
  rating: { average: 4.5, count: 10 },
  soldCount: 0,
  hiddenReason: null,
  publishedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

/** Mirrors the public search rules in memory (published only, filters, sort, pages). */
export class InMemoryProductsRepository extends ProductsRepository {
  public constructor(public readonly rows: Product[] = []) {
    super();
  }

  public findForModeration(criteria: ModerationCriteria): Promise<ProductPage> {
    const matches = this.rows
      .filter((product) => criteria.status === undefined || product.status === criteria.status)
      .filter(
        (product) =>
          criteria.q === undefined ||
          product.title.en.toLowerCase().includes(criteria.q.toLowerCase()),
      );
    const start = (criteria.page - 1) * criteria.pageSize;
    return Promise.resolve({
      items: matches.slice(start, start + criteria.pageSize),
      total: matches.length,
      page: criteria.page,
      pageSize: criteria.pageSize,
    });
  }

  public findBySlugs(slugs: string[]): Promise<Product[]> {
    return Promise.resolve(this.rows.filter((product) => slugs.includes(product.slug)));
  }

  public search(criteria: ProductSearchCriteria): Promise<ProductPage> {
    const text = criteria.text?.toLowerCase();
    const matches = this.rows
      .filter((product) => product.status === ProductStatus.Published)
      .filter(
        (product) =>
          text === undefined ||
          `${product.title.en} ${product.title.vi ?? ''}`.toLowerCase().includes(text),
      )
      .filter(
        (product) =>
          criteria.categoryIds === undefined || criteria.categoryIds.includes(product.categoryId),
      )
      .filter((product) => criteria.shopId === undefined || product.shopId === criteria.shopId)
      .filter((product) => product.minPriceUsdCents >= (criteria.minPriceUsdCents ?? 0))
      .filter(
        (product) =>
          product.minPriceUsdCents <= (criteria.maxPriceUsdCents ?? Number.MAX_SAFE_INTEGER),
      )
      .filter((product) => product.rating.average >= (criteria.minRating ?? 0));
    const sorted = [...matches].sort((a, b) =>
      criteria.sort === ProductSort.PriceAsc
        ? a.minPriceUsdCents - b.minPriceUsdCents
        : criteria.sort === ProductSort.PriceDesc
          ? b.minPriceUsdCents - a.minPriceUsdCents
          : criteria.sort === ProductSort.Rating
            ? b.rating.average - a.rating.average
            : criteria.sort === ProductSort.BestSelling
              ? b.soldCount - a.soldCount
              : 0,
    );
    const start = (criteria.page - 1) * criteria.pageSize;
    return Promise.resolve({
      items: sorted.slice(start, start + criteria.pageSize),
      total: sorted.length,
      page: criteria.page,
      pageSize: criteria.pageSize,
    });
  }

  public findBySlug(slug: string): Promise<Product | null> {
    return Promise.resolve(this.snapshot(this.rows.find((product) => product.slug === slug)));
  }

  public findById(id: string): Promise<Product | null> {
    return Promise.resolve(this.snapshot(this.rows.find((product) => product.id === id)));
  }

  public findBySeller(criteria: SellerProductsCriteria): Promise<ProductPage> {
    const mine = this.rows.filter(
      (product) =>
        product.sellerId === criteria.sellerId &&
        (criteria.status === undefined || product.status === criteria.status),
    );
    const start = (criteria.page - 1) * criteria.pageSize;
    return Promise.resolve({
      items: mine.slice(start, start + criteria.pageSize),
      total: mine.length,
      page: criteria.page,
      pageSize: criteria.pageSize,
    });
  }

  public create(product: NewProduct): Promise<Product> {
    this.assertSkusFree(
      product.variants.map((variant) => variant.sku),
      null,
    );
    const row: Product = {
      ...product,
      id: `p${this.rows.length + 100}`,
      images: [],
      rating: { average: 0, count: 0 },
      soldCount: 0,
      hiddenReason: null,
      publishedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.rows.push(row);
    return Promise.resolve({ ...row });
  }

  public update(id: string, changes: ProductChangesOptions): Promise<Product> {
    const row = this.rows.find((product) => product.id === id)!;
    if (changes.variants !== undefined) {
      this.assertSkusFree(
        changes.variants.map((variant) => variant.sku),
        id,
      );
    }
    Object.assign(row, changes);
    // Like a real database: callers get a snapshot, not the stored object.
    return Promise.resolve({ ...row });
  }

  private snapshot(product: Product | undefined): Product | null {
    return product === undefined ? null : { ...product };
  }

  /** Same rule as the unique index on variants.sku. */
  private assertSkusFree(skus: string[], ownerId: string | null): void {
    const clash = this.rows.some(
      (product) =>
        product.id !== ownerId && product.variants.some((variant) => skus.includes(variant.sku)),
    );
    if (clash) {
      throw new ConflictError('A SKU or slug in this product is already used by another product');
    }
  }
}

export class FakeObjectStorage extends ObjectStorage {
  public readonly objects = new Map<string, StoredObject>();
  public readonly deleted: string[] = [];

  public presignUpload(key: string, contentType: string): Promise<PresignedUpload> {
    return Promise.resolve({
      uploadUrl: `https://storage.test/${key}?signed`,
      key,
      expiresInSeconds: 300,
      headers: { 'content-type': contentType },
    });
  }

  public head(key: string): Promise<StoredObject | null> {
    return Promise.resolve(this.objects.get(key) ?? null);
  }

  public delete(key: string): Promise<void> {
    this.objects.delete(key);
    this.deleted.push(key);
    return Promise.resolve();
  }
}

/** Variant stock and reservations in memory, with the same all-or-nothing take rule. */
export class InMemoryStockRepository extends StockRepository {
  public readonly stock = new Map<string, number>();
  public readonly reservations = new Map<string, StockReservation>();
  /** Units counted as sold, per product id. */
  public readonly sold = new Map<string, number>();

  public set(productId: string, sku: string, units: number): void {
    this.stock.set(`${productId}/${sku}`, units);
  }

  public units(productId: string, sku: string): number {
    return this.stock.get(`${productId}/${sku}`) ?? 0;
  }

  public tryTake(line: StockLine): Promise<boolean> {
    const left = this.units(line.productId, line.variantSku);
    if (!this.stock.has(`${line.productId}/${line.variantSku}`) || left < line.quantity) {
      return Promise.resolve(false);
    }
    this.set(line.productId, line.variantSku, left - line.quantity);
    return Promise.resolve(true);
  }

  public giveBack(line: StockLine): Promise<void> {
    this.set(
      line.productId,
      line.variantSku,
      this.units(line.productId, line.variantSku) + line.quantity,
    );
    return Promise.resolve();
  }

  public addSold(line: StockLine): Promise<void> {
    this.sold.set(line.productId, (this.sold.get(line.productId) ?? 0) + line.quantity);
    return Promise.resolve();
  }

  public available(line: StockLine): Promise<number> {
    return Promise.resolve(this.units(line.productId, line.variantSku));
  }

  public findReservation(orderId: string): Promise<StockReservation | null> {
    const found = this.reservations.get(orderId);
    return Promise.resolve(found === undefined ? null : structuredClone(found));
  }

  public saveReservation(reservation: StockReservation): Promise<void> {
    this.reservations.set(reservation.orderId, structuredClone(reservation));
    return Promise.resolve();
  }

  public slugsOf(productIds: string[]): Promise<string[]> {
    return Promise.resolve(productIds.map((id) => `slug-${id}`));
  }
}

/** Reviews in memory with the same uniqueness rule (one per product and shopper). */
export class InMemoryReviewsRepository extends ReviewsRepository {
  public readonly eligible = new Set<string>();
  public readonly rows: Review[] = [];
  public readonly ratings = new Map<string, RatingSummary>();

  public markEligible(shopperId: string, productIds: string[]): Promise<void> {
    productIds.forEach((productId) => this.eligible.add(`${shopperId}:${productId}`));
    return Promise.resolve();
  }

  public isEligible(shopperId: string, productId: string): Promise<boolean> {
    return Promise.resolve(this.eligible.has(`${shopperId}:${productId}`));
  }

  public hasReviewed(shopperId: string, productId: string): Promise<boolean> {
    return Promise.resolve(
      this.rows.some((row) => row.shopperId === shopperId && row.productId === productId),
    );
  }

  public create(review: NewReview): Promise<Review> {
    if (
      this.rows.some(
        (row) => row.shopperId === review.shopperId && row.productId === review.productId,
      )
    ) {
      return Promise.reject(new DuplicateReviewError('You already reviewed this product'));
    }
    const created = { ...review, id: `review-${this.rows.length + 1}`, createdAt: NOW };
    this.rows.push(created);
    return Promise.resolve(created);
  }

  public page(productId: string, page: { page: number; pageSize: number }): Promise<ReviewPage> {
    const mine = this.rows.filter((row) => row.productId === productId).reverse();
    const start = (page.page - 1) * page.pageSize;
    return Promise.resolve({ items: mine.slice(start, start + page.pageSize), total: mine.length });
  }

  public summary(productId: string): Promise<RatingSummary> {
    const mine = this.rows.filter((row) => row.productId === productId);
    const average =
      mine.length === 0 ? 0 : mine.reduce((sum, row) => sum + row.rating, 0) / mine.length;
    return Promise.resolve({ average: Number(average.toFixed(2)), count: mine.length });
  }

  public saveRating(productId: string, rating: RatingSummary): Promise<void> {
    this.ratings.set(productId, rating);
    return Promise.resolve();
  }
}
