import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import type {
  Category,
  CreateProductRequest,
  SellerProduct,
  SellerProductPage,
  SellerProductsQuery,
  UpdateProductRequest,
} from '@/interfaces/product.interface';

import * as products from '../services/product.service';

import { productKeys } from './productKeys';

export const useSellerProducts = (query: SellerProductsQuery): UseQueryResult<SellerProductPage> =>
  useQuery({
    queryKey: productKeys.list(query),
    queryFn: () => products.listSellerProducts(query),
    placeholderData: keepPreviousData,
  });

export const useSellerProduct = (id: string | undefined): UseQueryResult<SellerProduct> =>
  useQuery({
    queryKey: productKeys.detail(id ?? 'new'),
    queryFn: () => products.getSellerProduct(id ?? ''),
    enabled: id !== undefined,
  });

export const useCategories = (): UseQueryResult<Category[]> =>
  useQuery({
    queryKey: productKeys.categories,
    queryFn: products.listCategories,
    staleTime: Infinity,
  });

/** Saves a product (create or update) and refreshes exactly what changed. */
export const useSaveProduct = (
  id: string | undefined,
): UseMutationResult<SellerProduct, Error, CreateProductRequest | UpdateProductRequest> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      id === undefined
        ? products.createProduct(body as CreateProductRequest)
        : products.updateProduct(id, body),
    onSuccess: (saved) => {
      client.setQueryData(productKeys.detail(saved.id), saved);
      void client.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

type ProductAction = 'publish' | 'unpublish' | { upload: File } | { remove: string };

/** Publish / unpublish / add or remove an image — each answers with the updated product. */
export const useProductAction = (
  id: string,
): UseMutationResult<SellerProduct, Error, ProductAction> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action) => {
      if (action === 'publish') return products.publishProduct(id);
      if (action === 'unpublish') return products.unpublishProduct(id);
      if ('upload' in action) return products.uploadProductImage(id, action.upload);
      return products.removeProductImage(id, action.remove);
    },
    onSuccess: (saved) => {
      client.setQueryData(productKeys.detail(saved.id), saved);
      void client.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};
