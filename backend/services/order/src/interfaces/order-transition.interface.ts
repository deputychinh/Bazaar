import type {
  CancelReason,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
} from '@bazaar/contracts';

/**
 * One conditional state change: applied only while the order is still in an allowed source
 * status, so racing writers (saga handler, timeout job, shopper) cannot both win.
 */
export interface OrderTransition {
  orderId: string;
  to: OrderStatus;
  cancelReason?: CancelReason;
  /** Moves every seller order that may reach this status. */
  sellerOrders?: { to: SellerOrderStatus; cancelReason?: CancelReason; at?: Date };
  payment?: { status: PaymentStatus; providerRef?: string; failureReason?: string };
}

export interface SellerOrderTransition {
  sellerOrderId: string;
  to: SellerOrderStatus;
  cancelReason?: CancelReason;
  at: Date;
}
