import type { CancelReason } from '../enums/cancel-reason.enum';

import type { OrderLine } from './order-line.interface';

export interface OrderCreatedPayload {
  orderId: string;
  shopperId: string;
  totalUsdCents: number;
  lines: OrderLine[];
}

export interface OrderPaidPayload {
  orderId: string;
  paymentId: string;
  amountUsdCents: number;
}

export interface OrderConfirmedPayload {
  orderId: string;
  shopperId: string;
}

export interface OrderCancelledPayload {
  orderId: string;
  shopperId: string;
  reason: CancelReason;
  lines: OrderLine[];
}

export interface OrderCompletedPayload {
  orderId: string;
  shopperId: string;
}

export interface SellerOrderShippedPayload {
  orderId: string;
  sellerOrderId: string;
  sellerId: string;
  shopperId: string;
}

export interface SellerOrderDeliveredPayload {
  orderId: string;
  sellerOrderId: string;
  sellerId: string;
  shopperId: string;
  productIds: string[];
}

export interface SellerOrderCancelledPayload {
  orderId: string;
  sellerOrderId: string;
  sellerId: string;
  shopperId: string;
  reason: CancelReason;
  lines: OrderLine[];
}
