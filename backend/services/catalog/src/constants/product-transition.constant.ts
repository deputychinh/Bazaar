import { ProductStatus } from '@bazaar/contracts';

import { ProductAction } from '../enums/product-action.enum.js';
import type { ProductTransitionRule } from '../interfaces/product-transition.interface.js';

/** Allowed status changes. Sellers publish/unpublish; only admins hide and restore. */
export const PRODUCT_TRANSITIONS: Readonly<Record<ProductAction, ProductTransitionRule>> = {
  [ProductAction.Publish]: { from: [ProductStatus.Draft], to: ProductStatus.Published },
  [ProductAction.Unpublish]: { from: [ProductStatus.Published], to: ProductStatus.Draft },
  [ProductAction.Hide]: {
    from: [ProductStatus.Draft, ProductStatus.Published],
    to: ProductStatus.Hidden,
  },
  [ProductAction.Restore]: { from: [ProductStatus.Hidden], to: ProductStatus.Draft },
};
