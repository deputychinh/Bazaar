import type { LocalizedText, ProductStatus } from '@bazaar/contracts';

import type { ProductSort } from '../enums/product-sort.enum.js';

export interface ProductVariant {
  sku: string;
  priceUsdCents: number;
  stock: number;
  attributes: Record<string, unknown> | null;
}

export interface ProductImage {
  key: string;
  alt: LocalizedText | null;
}

export interface Product {
  id: string;
  shopId: string;
  sellerId: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  categoryId: string;
  attributes: Record<string, unknown> | null;
  variants: ProductVariant[];
  images: ProductImage[];
  status: ProductStatus;
  minPriceUsdCents: number;
  totalStock: number;
  rating: { average: number; count: number };
  /** Units in confirmed orders. */
  soldCount: number;
  hiddenReason: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Public catalog query, already resolved to ids (plan FR-04). */
export interface ProductSearchCriteria {
  text?: string;
  categoryIds?: string[];
  shopId?: string;
  minPriceUsdCents?: number;
  maxPriceUsdCents?: number;
  minRating?: number;
  sort: ProductSort;
  page: number;
  pageSize: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NewProduct {
  shopId: string;
  sellerId: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  categoryId: string;
  attributes: Record<string, unknown> | null;
  variants: ProductVariant[];
  status: ProductStatus;
  minPriceUsdCents: number;
  totalStock: number;
}

/** Admin moderation list: any status and seller, optional title search. */
export interface ModerationCriteria {
  status?: ProductStatus;
  q?: string;
  page: number;
  pageSize: number;
}

export interface SellerProductsCriteria {
  sellerId: string;
  status?: ProductStatus;
  page: number;
  pageSize: number;
}
