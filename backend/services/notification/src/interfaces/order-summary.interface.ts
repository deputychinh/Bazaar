export interface SellerPart {
  sellerOrderId: string;
  sellerId: string;
  subtotalUsdCents: number;
  itemCount: number;
}

export interface OrderSummary {
  orderId: string;
  shopperId: string;
  totalUsdCents: number;
  sellers: SellerPart[];
  createdAt: Date;
}
