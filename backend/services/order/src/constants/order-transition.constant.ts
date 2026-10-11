import { OrderStatus, SellerOrderStatus } from '@bazaar/contracts';

/** Allowed order moves (plan §2B): PENDING → RESERVED → PAID → CONFIRMED → COMPLETED, or CANCELLED. */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.Pending]: [OrderStatus.Reserved, OrderStatus.Cancelled],
  [OrderStatus.Reserved]: [OrderStatus.Paid, OrderStatus.Cancelled],
  [OrderStatus.Paid]: [OrderStatus.Confirmed, OrderStatus.Cancelled],
  [OrderStatus.Confirmed]: [OrderStatus.Completed, OrderStatus.Cancelled],
  [OrderStatus.Completed]: [],
  [OrderStatus.Cancelled]: [],
};

/** Allowed seller order moves: PENDING → CONFIRMED → SHIPPED → DELIVERED, or CANCELLED before shipping. */
export const SELLER_ORDER_TRANSITIONS: Readonly<
  Record<SellerOrderStatus, readonly SellerOrderStatus[]>
> = {
  [SellerOrderStatus.Pending]: [SellerOrderStatus.Confirmed, SellerOrderStatus.Cancelled],
  [SellerOrderStatus.Confirmed]: [SellerOrderStatus.Shipped, SellerOrderStatus.Cancelled],
  [SellerOrderStatus.Shipped]: [SellerOrderStatus.Delivered],
  [SellerOrderStatus.Delivered]: [],
  [SellerOrderStatus.Cancelled]: [],
};
