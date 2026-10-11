import type { PricedOrderLine } from '@bazaar/contracts';

import type { NewSellerOrder } from '../../../interfaces/order.interface.js';

/**
 * One checkout becomes one SellerOrder per seller (plan §2B), in the order sellers first appear.
 * Totals are integer USD cents, summed exactly.
 */
export class OrderSplitter {
  public static split(lines: readonly PricedOrderLine[]): NewSellerOrder[] {
    const bySeller = new Map<string, NewSellerOrder>();
    for (const line of lines) {
      const group = bySeller.get(line.sellerId) ?? {
        sellerId: line.sellerId,
        shopId: line.shopId,
        shopName: line.shopName,
        subtotalUsdCents: 0,
        items: [],
      };
      group.items.push({
        productId: line.productId,
        productSlug: line.productSlug,
        variantSku: line.variantSku,
        title: line.title,
        variantLabel: line.variantLabel,
        imageUrl: line.imageUrl,
        quantity: line.quantity,
        unitPriceUsdCents: line.unitPriceUsdCents,
      });
      group.subtotalUsdCents += line.unitPriceUsdCents * line.quantity;
      bySeller.set(line.sellerId, group);
    }
    return [...bySeller.values()];
  }

  public static total(sellerOrders: readonly NewSellerOrder[]): number {
    return sellerOrders.reduce((sum, sellerOrder) => sum + sellerOrder.subtotalUsdCents, 0);
  }
}
