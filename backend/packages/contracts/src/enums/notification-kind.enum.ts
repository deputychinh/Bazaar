/** What an in-app notification is about; clients translate it (plan F10, FR-08). */
export enum NotificationKind {
  OrderConfirmed = 'ORDER_CONFIRMED',
  OrderCancelled = 'ORDER_CANCELLED',
  OrderCompleted = 'ORDER_COMPLETED',
  SellerOrderShipped = 'SELLER_ORDER_SHIPPED',
  SellerOrderDelivered = 'SELLER_ORDER_DELIVERED',
  /** To a seller: a paid order is waiting for them. */
  NewSellerOrder = 'NEW_SELLER_ORDER',
  /** To a seller: the shopper cancelled their part before shipping. */
  SellerOrderCancelled = 'SELLER_ORDER_CANCELLED',
}
