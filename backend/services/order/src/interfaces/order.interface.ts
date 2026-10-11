import type {
  CancelReason,
  LocalizedText,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
} from '@bazaar/contracts';

export interface OrderItem {
  id: string;
  productId: string;
  productSlug: string;
  variantSku: string;
  title: LocalizedText;
  variantLabel: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceUsdCents: number;
}

export interface SellerOrder {
  id: string;
  orderId: string;
  sellerId: string;
  shopId: string;
  shopName: string;
  status: SellerOrderStatus;
  subtotalUsdCents: number;
  cancelReason: CancelReason | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  items: OrderItem[];
}

export interface Payment {
  id: string;
  status: PaymentStatus;
  providerToken: string;
  providerRef: string | null;
  cardLast4: string;
  amountUsdCents: number;
  failureReason: string | null;
}

export interface Order {
  id: string;
  shopperId: string;
  status: OrderStatus;
  totalUsdCents: number;
  cancelReason: CancelReason | null;
  idempotencyKey: string;
  sellerOrders: SellerOrder[];
  payment: Payment | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewOrderItem = Omit<OrderItem, 'id'>;

export interface NewSellerOrder {
  sellerId: string;
  shopId: string;
  shopName: string;
  subtotalUsdCents: number;
  items: NewOrderItem[];
}

export interface NewOrder {
  shopperId: string;
  idempotencyKey: string;
  totalUsdCents: number;
  sellerOrders: NewSellerOrder[];
  payment: { providerToken: string; cardLast4: string };
}
