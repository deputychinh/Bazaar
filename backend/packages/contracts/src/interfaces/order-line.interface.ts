/** One purchased line, as carried in order and stock events. */
export interface OrderLine {
  sellerOrderId: string;
  sellerId: string;
  productId: string;
  variantSku: string;
  quantity: number;
  unitPriceUsdCents: number;
}
