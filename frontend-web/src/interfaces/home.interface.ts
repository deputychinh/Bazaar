import type { Category, ProductSummary } from './catalog.interface';

/** A category tile on the home page, pictured by its best-selling product. */
export interface CategoryTile {
  slug: string;
  name: Category['name'];
  imageUrl: string | null;
}

/** Everything the home page shows below the banner. */
export interface HomeFeed {
  topSales: ProductSummary[];
  discover: ProductSummary[];
  categories: CategoryTile[];
}
