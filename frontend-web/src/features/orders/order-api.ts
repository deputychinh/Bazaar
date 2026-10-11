import { browserGatewayApi, browserOrderApi } from '@/api/client.browser';
import { ErrorCode } from '@/api/gateway.schema';
import type { ApiResult } from '@/interfaces/api-result.interface';
import type {
  CartProblemLine,
  OrderPage,
  OrderView,
  PlaceOrderOptions,
  PlaceOrderResult,
} from '@/interfaces/order.interface';

const UNREACHABLE = { data: null, errorCode: ErrorCode.UPSTREAM_UNAVAILABLE } as const;
const auth = (accessToken: string): { authorization: string } => ({
  authorization: `Bearer ${accessToken}`,
});

/** POST /orders with the retry key; a CART_CHANGED answer carries the lines to fix. */
export const placeOrder = async ({
  accessToken,
  idempotencyKey,
  request,
}: PlaceOrderOptions): Promise<PlaceOrderResult> => {
  try {
    const { data, error } = await browserGatewayApi.POST('/api/v1/orders', {
      params: { header: { 'Idempotency-Key': idempotencyKey } },
      headers: auth(accessToken),
      body: request,
    });
    if (data !== undefined) return { order: data, errorCode: null, problems: [] };
    const problems =
      error.code === ErrorCode.CART_CHANGED && 'details' in error
        ? ((error.details as { lines?: CartProblemLine[] } | undefined)?.lines ?? [])
        : [];
    return { order: null, errorCode: error.code, problems };
  } catch {
    return { order: null, errorCode: ErrorCode.UPSTREAM_UNAVAILABLE, problems: [] };
  }
};

export const listOrders = async (
  accessToken: string,
  page: number,
): Promise<ApiResult<OrderPage>> => {
  try {
    const { data, error } = await browserOrderApi.GET('/api/v1/orders', {
      params: { query: { page } },
      headers: auth(accessToken),
    });
    return data === undefined ? { data: null, errorCode: error.code } : { data, errorCode: null };
  } catch {
    return UNREACHABLE;
  }
};

export const getOrder = async (accessToken: string, id: string): Promise<ApiResult<OrderView>> => {
  try {
    const { data, error } = await browserOrderApi.GET('/api/v1/orders/{id}', {
      params: { path: { id } },
      headers: auth(accessToken),
    });
    return data === undefined ? { data: null, errorCode: error.code } : { data, errorCode: null };
  } catch {
    return UNREACHABLE;
  }
};

export const cancelSellerOrder = async (
  accessToken: string,
  ids: { orderId: string; sellerOrderId: string },
): Promise<ApiResult<OrderView>> => {
  try {
    const { data, error } = await browserOrderApi.POST(
      '/api/v1/orders/{id}/seller-orders/{sellerOrderId}/cancel',
      {
        params: { path: { id: ids.orderId, sellerOrderId: ids.sellerOrderId } },
        headers: auth(accessToken),
      },
    );
    return data === undefined ? { data: null, errorCode: error.code } : { data, errorCode: null };
  } catch {
    return UNREACHABLE;
  }
};
