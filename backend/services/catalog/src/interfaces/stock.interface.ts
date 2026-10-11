import type { ReservationStatus } from '../enums/reservation-status.enum.js';

export interface StockLine {
  sellerOrderId: string;
  productId: string;
  variantSku: string;
  quantity: number;
}

export interface StockReservation {
  orderId: string;
  status: ReservationStatus;
  lines: StockLine[];
  releasedSellerOrderIds: string[];
}
