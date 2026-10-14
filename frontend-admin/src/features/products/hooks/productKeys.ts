import type { SellerProductsQuery } from '@/interfaces/product.interface';

/** Query key factory (plan §6A.4): exact invalidation per list and per product. */
export const productKeys = {
  all: ['seller-products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (query: SellerProductsQuery) => [...productKeys.lists(), query] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
  categories: ['categories'] as const,
};
