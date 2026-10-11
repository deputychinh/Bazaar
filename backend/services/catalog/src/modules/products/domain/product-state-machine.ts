import { ProductStatus } from '@bazaar/contracts';

import { PRODUCT_TRANSITIONS } from '../../../constants/product-transition.constant.js';
import type { ProductAction } from '../../../enums/product-action.enum.js';
import { InvalidProductTransitionError } from '../errors/invalid-product-transition.error.js';

export class ProductStateMachine {
  public static transition(current: ProductStatus, action: ProductAction): ProductStatus {
    const rule = PRODUCT_TRANSITIONS[action];
    if (!rule.from.includes(current)) {
      throw new InvalidProductTransitionError(
        current === ProductStatus.Hidden
          ? 'This product was hidden by moderation; contact support to restore it'
          : `Cannot ${action.toLowerCase()} a product that is ${current.toLowerCase()}`,
        { from: current, action },
      );
    }
    return rule.to;
  }

  /** Whether shoppers can see a product in this status. */
  public static isPublic(status: ProductStatus): boolean {
    return status === ProductStatus.Published;
  }
}
