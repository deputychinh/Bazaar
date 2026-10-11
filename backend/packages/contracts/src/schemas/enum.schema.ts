import { z } from 'zod';

import { Locale } from '../enums/locale.enum.js';
import { ProductStatus } from '../enums/product-status.enum.js';
import { SellerApplicationStatus } from '../enums/seller-application-status.enum.js';
import { ShopStatus } from '../enums/shop-status.enum.js';
import { UserRole } from '../enums/user-role.enum.js';
import { UserStatus } from '../enums/user-status.enum.js';

// An id becomes the enum's OpenAPI component name; zod rejects registering the same id twice,
// so every API-facing enum gets exactly one schema here.
export const localeSchema = z.enum(Locale).meta({ id: 'Locale' });
export const productStatusSchema = z.enum(ProductStatus).meta({ id: 'ProductStatus' });
export const sellerApplicationStatusSchema = z
  .enum(SellerApplicationStatus)
  .meta({ id: 'SellerApplicationStatus' });
export const shopStatusSchema = z.enum(ShopStatus).meta({ id: 'ShopStatus' });
export const userRoleSchema = z.enum(UserRole).meta({ id: 'UserRole' });
export const userStatusSchema = z.enum(UserStatus).meta({ id: 'UserStatus' });
