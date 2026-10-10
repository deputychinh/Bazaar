export interface StockReservedPayload {
  orderId: string;
}

export interface UnavailableLine {
  variantSku: string;
  requested: number;
  available: number;
}

export interface StockRejectedPayload {
  orderId: string;
  unavailable: UnavailableLine[];
}

export interface StockReleasedPayload {
  orderId: string;
  sellerOrderId: string | null;
}
