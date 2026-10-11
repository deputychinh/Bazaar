/** Every email the platform sends (plan F10); each has an EN and a VI template. */
export enum EmailKind {
  VerifyEmail = 'VERIFY_EMAIL',
  ResetPassword = 'RESET_PASSWORD',
  OrderConfirmed = 'ORDER_CONFIRMED',
  OrderCancelled = 'ORDER_CANCELLED',
  SellerOrderShipped = 'SELLER_ORDER_SHIPPED',
  SellerOrderDelivered = 'SELLER_ORDER_DELIVERED',
  NewSellerOrder = 'NEW_SELLER_ORDER',
}
