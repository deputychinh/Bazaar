import type { ProductStatus } from '@bazaar/contracts';

export interface ProductTransitionRule {
  from: readonly ProductStatus[];
  to: ProductStatus;
}
