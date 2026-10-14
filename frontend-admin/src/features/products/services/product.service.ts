import { ImageContentType } from '@/api/catalog.schema';
import { catalogApi } from '@/api/client';
import type {
  Category,
  CreateProductRequest,
  SellerProduct,
  SellerProductPage,
  SellerProductsQuery,
  UpdateProductRequest,
  UploadTicket,
} from '@/interfaces/product.interface';
import { apiFailure } from '@/utils/api-error.util';

/** A typed call's data, or a thrown failure carrying the problem code (for TanStack Query). */
const unwrap = <T>(result: { data?: T; error?: { code: string; details?: unknown } }): T => {
  if (result.data !== undefined) return result.data;
  throw apiFailure(result.error?.code ?? 'INTERNAL', result.error?.details);
};

export const listSellerProducts = async (query: SellerProductsQuery): Promise<SellerProductPage> =>
  unwrap(await catalogApi.GET('/api/v1/seller/products', { params: { query } }));

export const getSellerProduct = async (id: string): Promise<SellerProduct> =>
  unwrap(await catalogApi.GET('/api/v1/seller/products/{id}', { params: { path: { id } } }));

export const createProduct = async (body: CreateProductRequest): Promise<SellerProduct> =>
  unwrap(await catalogApi.POST('/api/v1/seller/products', { body }));

export const updateProduct = async (
  id: string,
  body: UpdateProductRequest,
): Promise<SellerProduct> =>
  unwrap(
    await catalogApi.PATCH('/api/v1/seller/products/{id}', { params: { path: { id } }, body }),
  );

export const publishProduct = async (id: string): Promise<SellerProduct> =>
  unwrap(
    await catalogApi.POST('/api/v1/seller/products/{id}/publish', { params: { path: { id } } }),
  );

export const unpublishProduct = async (id: string): Promise<SellerProduct> =>
  unwrap(
    await catalogApi.POST('/api/v1/seller/products/{id}/unpublish', { params: { path: { id } } }),
  );

export const listCategories = async (): Promise<Category[]> =>
  unwrap(await catalogApi.GET('/api/v1/categories'));

/**
 * Image upload in three steps (plan §2B): ask for a presigned URL, PUT the file straight to
 * object storage, then attach the stored key to the product.
 */
export const uploadProductImage = async (id: string, file: File): Promise<SellerProduct> => {
  const contentType = Object.values(ImageContentType).find((type) => String(type) === file.type);
  if (contentType === undefined) throw apiFailure('VALIDATION_FAILED');
  const ticket: UploadTicket = unwrap(
    await catalogApi.POST('/api/v1/seller/products/{id}/images/upload-url', {
      params: { path: { id } },
      body: { contentType, sizeBytes: file.size },
    }),
  );
  const stored = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: ticket.headers,
    body: file,
  });
  if (!stored.ok) throw apiFailure('UPSTREAM_UNAVAILABLE');
  return unwrap(
    await catalogApi.POST('/api/v1/seller/products/{id}/images', {
      params: { path: { id } },
      body: { key: ticket.key },
    }),
  );
};

export const removeProductImage = async (id: string, key: string): Promise<SellerProduct> =>
  unwrap(
    await catalogApi.DELETE('/api/v1/seller/products/{id}/images', {
      params: { path: { id }, query: { key } },
    }),
  );
