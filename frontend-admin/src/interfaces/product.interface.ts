import type { components, operations, paths } from '@/api/catalog.schema';

/** Shapes taken from the generated contracts — never written by hand (plan DS-01). */
export type SellerProduct =
  paths['/api/v1/seller/products/{id}']['get']['responses'][200]['content']['application/json'];
export type SellerProductPage =
  paths['/api/v1/seller/products']['get']['responses'][200]['content']['application/json'];
export type SellerProductsQuery = NonNullable<
  operations['SellerProductsController_list']['parameters']['query']
>;
export type CreateProductRequest = NonNullable<
  paths['/api/v1/seller/products']['post']['requestBody']
>['content']['application/json'];
export type UpdateProductRequest = NonNullable<
  paths['/api/v1/seller/products/{id}']['patch']['requestBody']
>['content']['application/json'];
export type UploadTicket =
  paths['/api/v1/seller/products/{id}/images/upload-url']['post']['responses'][200]['content']['application/json'];
export type Category = components['schemas']['CategoryResponse'];

/** What the product form edits; money in dollars as typed, converted to cents on save. */
export interface ProductFormValues {
  titleEn: string;
  titleVi: string;
  descriptionEn: string;
  descriptionVi: string;
  categoryId: string;
  variants: { sku: string; price: string; stock: number; colourEn: string; colourVi: string }[];
}
