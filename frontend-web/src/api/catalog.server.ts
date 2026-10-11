import 'server-only';

import { cache } from 'react';

import { ErrorCode } from '@/api/gateway.schema';
import type { ApiResult } from '@/interfaces/api-result.interface';
import type {
  CatalogQuery,
  Category,
  ProductDetail,
  ProductPage,
  Shop,
} from '@/interfaces/catalog.interface';

import { catalogApi } from './client.server';

const UNREACHABLE = { data: null, errorCode: ErrorCode.UPSTREAM_UNAVAILABLE } as const;

export const listProducts = async (query: CatalogQuery): Promise<ApiResult<ProductPage>> => {
  try {
    const { data, error } = await catalogApi.GET('/api/v1/products', { params: { query } });
    return data === undefined ? { data: null, errorCode: error.code } : { data, errorCode: null };
  } catch {
    return UNREACHABLE;
  }
};

export const listCategories = async (): Promise<Category[]> => {
  try {
    const { data } = await catalogApi.GET('/api/v1/categories');
    return data ?? [];
  } catch {
    return [];
  }
};

/**
 * A published product, or null when it does not exist (404). Other failures throw so an ISR
 * regeneration keeps serving the last good page instead of caching an error.
 */
export const getProduct = cache(async (slug: string): Promise<ProductDetail | null> => {
  const { data, response } = await catalogApi.GET('/api/v1/products/{slug}', {
    params: { path: { slug } },
  });
  if (data !== undefined) return data;
  if (response.status === 404) return null;
  throw new Error(`Catalog answered ${response.status} for product ${slug}`);
});

/** A shop by slug, or null when it does not exist. */
export const getShop = cache(async (slug: string): Promise<Shop | null> => {
  try {
    const { data } = await catalogApi.GET('/api/v1/shops/{slug}', { params: { path: { slug } } });
    return data ?? null;
  } catch {
    return null;
  }
});
