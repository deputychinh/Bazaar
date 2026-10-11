import type {
  Product,
  ProductPage,
  ProductSearchCriteria,
} from '../../../interfaces/product.interface.js';

export abstract class ProductsRepository {
  /** Published products only. */
  public abstract search(criteria: ProductSearchCriteria): Promise<ProductPage>;

  public abstract findBySlug(slug: string): Promise<Product | null>;
}
