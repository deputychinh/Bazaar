import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { SELLER_ORDERS_REFRESH_MS } from '@/constants/orders.constant';
import type {
  SellerOrderPage,
  SellerOrdersQuery,
  SellerOrderView,
} from '@/interfaces/order.interface';

import {
  deliverSellerOrder,
  listSellerOrders,
  shipSellerOrder,
} from '../services/seller-order.service';

export const sellerOrderKeys = {
  all: ['seller-orders'] as const,
  list: (query: SellerOrdersQuery) => [...sellerOrderKeys.all, query] as const,
};

export const useSellerOrders = (query: SellerOrdersQuery): UseQueryResult<SellerOrderPage> =>
  useQuery({
    queryKey: sellerOrderKeys.list(query),
    queryFn: () => listSellerOrders(query),
    placeholderData: keepPreviousData,
    refetchInterval: SELLER_ORDERS_REFRESH_MS,
  });

/** Ship or deliver one seller order; every queue view refreshes afterwards. */
export const useFulfil = (): UseMutationResult<
  SellerOrderView,
  Error,
  { id: string; step: 'ship' | 'deliver' }
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, step }) => (step === 'ship' ? shipSellerOrder(id) : deliverSellerOrder(id)),
    onSuccess: () => void client.invalidateQueries({ queryKey: sellerOrderKeys.all }),
  });
};
