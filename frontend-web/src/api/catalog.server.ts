import 'server-only';

import { ErrorCode } from '@/api/gateway.schema';
import type { ApiResult } from '@/interfaces/api-result.interface';
import type { CatalogQuery, Category, ProductPage } from '@/interfaces/catalog.interface';

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
