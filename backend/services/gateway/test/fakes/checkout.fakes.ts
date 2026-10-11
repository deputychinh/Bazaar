import {
  type CreateOrderRequest,
  OrderStatus,
  type OrderView,
  type PricedQuoteLine,
  QuoteProblem,
  type QuoteLine,
  type QuoteRequest,
  type QuoteResponse,
} from '@bazaar/contracts';

import type { CreatedOrder } from '../../src/interfaces/created-order.interface.js';
import { InternalServices } from '../../src/modules/checkout/clients/internal-services.js';

export const pricedQuoteLine = (overrides: Partial<PricedQuoteLine> = {}): PricedQuoteLine => ({
  productSlug: 'silk-lantern',
  variantSku: 'LAN-RED',
  quantity: 1,
  available: true,
  productId: 'p1',
  sellerId: 'seller-1',
  shopId: 'shop-1',
  shopName: 'Hội An Lights',
  title: { en: 'Silk lantern' },
  variantLabel: { en: 'Red', vi: 'Đỏ' },
  imageUrl: null,
  unitPriceUsdCents: 1500,
  stock: 5,
  ...overrides,
});

export const orderView = (overrides: Partial<OrderView> = {}): OrderView => ({
  id: 'order-1',
  status: OrderStatus.Pending,
  totalUsdCents: 1500,
  cancelReason: null,
  payment: null,
  sellerOrders: [],
  createdAt: '2026-10-11T08:00:00.000Z',
  updatedAt: '2026-10-11T08:00:00.000Z',
  ...overrides,
});

/** Answers quotes from a fixed list; records what checkout asked the order service. */
export class FakeInternalServices extends InternalServices {
  public quoted: QuoteRequest[] = [];
  public ordered: { request: CreateOrderRequest; authorization: string }[] = [];
  public answer: QuoteLine[] = [pricedQuoteLine()];
  public created = true;

  public quote(request: QuoteRequest): Promise<QuoteResponse> {
    this.quoted.push(request);
    return Promise.resolve({ lines: this.answer });
  }

  public createOrder(request: CreateOrderRequest, authorization: string): Promise<CreatedOrder> {
    this.ordered.push({ request, authorization });
    return Promise.resolve({ order: orderView(), created: this.created });
  }
}

export const outOfStock = (): QuoteLine => ({
  productSlug: 'silk-lantern',
  variantSku: 'LAN-BLUE',
  quantity: 3,
  available: false,
  problem: QuoteProblem.InsufficientStock,
  stock: 1,
});
