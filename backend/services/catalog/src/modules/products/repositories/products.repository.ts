import type { LocalizedText, ProductStatus } from '@bazaar/contracts';

import type {
  NewProduct,
  Product,
  ProductImage,
  ProductPage,
  ProductSearchCriteria,
  ProductVariant,
  SellerProductsCriteria,
} from '../../../interfaces/product.interface.js';
import type { Transaction } from '../../../interfaces/transaction.interface.js';

export interface ProductChangesOptions {
  title?: LocalizedText;
  description?: LocalizedText;
  categoryId?: string;
  attributes?: Record<string, unknown> | null;
  variants?: ProductVariant[];
  images?: ProductImage[];
  status?: ProductStatus;
  minPriceUsdCents?: number;
  totalStock?: number;
  hiddenReason?: string | null;
  publishedAt?: Date | null;
}

export abstract class ProductsRepository {
  /** Published products only. */
  public abstract search(criteria: ProductSearchCriteria): Promise<ProductPage>;

  public abstract findBySlug(slug: string): Promise<Product | null>;

  public abstract findById(id: string): Promise<Product | null>;

  public abstract findBySeller(criteria: SellerProductsCriteria): Promise<ProductPage>;

  /** Throws ConflictError when a SKU is already used by another product. */
  public abstract create(product: NewProduct, transaction: Transaction): Promise<Product>;

  public abstract update(
    id: string,
    changes: ProductChangesOptions,
    transaction: Transaction,
  ): Promise<Product>;
}
