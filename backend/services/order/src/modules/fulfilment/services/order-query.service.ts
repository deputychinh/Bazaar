import type { OrderView, SellerOrderStatus } from '@bazaar/contracts';
import { NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { PageRequest } from '../../../interfaces/page-request.interface.js';
import { OrderMapper } from '../../orders/mappers/order.mapper.js';
import { OrdersRepository } from '../../orders/repositories/orders.repository.js';
import type { OrderPage, SellerOrderPage } from '../dto/orders.dto.js';

/** What shoppers and sellers may read: their own orders only. */
@Injectable()
export class OrderQueryService {
  public constructor(private readonly orders: OrdersRepository) {}

  public async mine(shopperId: string, page: PageRequest): Promise<OrderPage> {
    const { items, total } = await this.orders.findByShopper(shopperId, page);
    return { items: items.map((order) => OrderMapper.toView(order)), total, ...page };
  }

  public async one(shopperId: string, orderId: string): Promise<OrderView> {
    const order = await this.orders.findById(orderId);
    if (order?.shopperId !== shopperId) throw new NotFoundError('Order', orderId);
    return OrderMapper.toView(order);
  }

  public async forSeller(
    sellerId: string,
    filter: { status?: SellerOrderStatus } & PageRequest,
  ): Promise<SellerOrderPage> {
    const { items, total } = await this.orders.findSellerOrders(sellerId, filter);
    return {
      items: items.map((part) => OrderMapper.toSellerOrderView(part)),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }
}
