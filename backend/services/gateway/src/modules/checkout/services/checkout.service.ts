import type { CheckoutRequest, PricedQuoteLine } from '@bazaar/contracts';
import { Injectable } from '@nestjs/common';

import { CartChangedError } from '../../../common/errors/cart-changed.error.js';
import type { CreatedOrder } from '../../../interfaces/created-order.interface.js';
import { InternalServices } from '../clients/internal-services.js';

/**
 * Checkout orchestration at the edge (plan §P4, DS-03 allows gateway → service calls): the catalog
 * prices the cart, then the order service records the order with those prices. Stock is reserved
 * afterwards by the saga, so a passing quote is advisory — never a promise.
 */
@Injectable()
export class CheckoutService {
  public constructor(private readonly services: InternalServices) {}

  public async checkout(
    request: CheckoutRequest,
    idempotencyKey: string,
    authorization: string,
  ): Promise<CreatedOrder> {
    const { lines } = await this.services.quote({ lines: request.lines });
    const priced = lines.filter((line): line is PricedQuoteLine => line.available);
    if (priced.length !== lines.length) {
      throw new CartChangedError('Some items changed since they were added to the cart', {
        lines: lines.filter((line) => !line.available),
      });
    }
    return this.services.createOrder(
      {
        idempotencyKey,
        card: request.card,
        lines: priced.map((line) => ({
          productId: line.productId,
          productSlug: line.productSlug,
          variantSku: line.variantSku,
          quantity: line.quantity,
          sellerId: line.sellerId,
          shopId: line.shopId,
          shopName: line.shopName,
          title: line.title,
          variantLabel: line.variantLabel,
          imageUrl: line.imageUrl,
          unitPriceUsdCents: line.unitPriceUsdCents,
        })),
      },
      authorization,
    );
  }
}
