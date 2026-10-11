import type { components as GatewayComponents } from '@/api/gateway.schema';
import type { components as OrderComponents } from '@/api/order.schema';

/** Shapes taken from the generated contracts — never written by hand (plan DS-01). */
export type OrderView = OrderComponents['schemas']['Order'];
export type SellerOrderView = OrderComponents['schemas']['SellerOrder'];
export type OrderPage = OrderComponents['schemas']['OrderPage'];
export type CheckoutRequest = GatewayComponents['schemas']['CheckoutRequest'];
type CartChangedLine =
  GatewayComponents['schemas']['CartChangedProblem']['details']['lines'][number];
/** A cart line checkout refused, with the reason (QuoteProblem). */
export type CartProblemLine = Extract<CartChangedLine, { available: false }>;

export interface PlaceOrderOptions {
  accessToken: string;
  idempotencyKey: string;
  request: CheckoutRequest;
}

/** Placed order, or the error code — with the lines to fix when the cart changed. */
export type PlaceOrderResult =
  | { order: OrderView; errorCode: null; problems: [] }
  | {
      order: null;
      errorCode: GatewayComponents['schemas']['ErrorCode'];
      problems: CartProblemLine[];
    };
