import { type AnyEventEnvelope, ProductStatus, UserRole } from '@bazaar/contracts';
import {
  type AuthenticatedUser,
  ConflictError,
  EnumUtil,
  ProcessedEventStore,
  TokenVerifier,
  UnauthenticatedError,
} from '@bazaar/nest-common';

import { TransactionManager } from '../../src/common/transaction/transaction-manager.js';
import { ProductSort } from '../../src/enums/product-sort.enum.js';
import type { Category } from '../../src/interfaces/category.interface.js';
import type {
  NewProduct,
  Product,
  ProductPage,
  ProductSearchCriteria,
  SellerProductsCriteria,
} from '../../src/interfaces/product.interface.js';
import type { NewShop, Shop } from '../../src/interfaces/shop.interface.js';
import type { Transaction } from '../../src/interfaces/transaction.interface.js';
import { CategoriesRepository } from '../../src/modules/categories/repositories/categories.repository.js';
import { EventOutbox } from '../../src/modules/outbox/event-outbox.js';
import {
  type ProductChangesOptions,
  ProductsRepository,
} from '../../src/modules/products/repositories/products.repository.js';
import {
  type ShopChangesOptions,
  ShopsRepository,
} from '../../src/modules/shops/repositories/shops.repository.js';

export const NOW = new Date('2026-10-11T08:00:00.000Z');
export const NO_TRANSACTION = {} as Transaction;

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
