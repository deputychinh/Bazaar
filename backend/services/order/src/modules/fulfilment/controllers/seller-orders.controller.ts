import { type SellerOrderView, sellerOrderViewSchema, UserRole } from '@bazaar/contracts';
import {
  ApiZodQuery,
  ApiZodResponse,
  type AuthenticatedUser,
  CurrentUser,
  NotFoundError,
  Roles,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import type { Order } from '../../../interfaces/order.interface.js';
import { OrderMapper } from '../../orders/mappers/order.mapper.js';
import {
  type ListSellerOrdersQuery,
  listSellerOrdersQuerySchema,
  type SellerOrderPage,
  sellerOrderPageSchema,
} from '../dto/orders.dto.js';
import { FulfilmentService } from '../services/fulfilment.service.js';
import { OrderQueryService } from '../services/order-query.service.js';

/** A seller's queue: their part of each confirmed order, and the fulfilment steps. */
@ApiTags('seller')
@ApiBearerAuth()
@Roles(UserRole.Seller)
@Controller('seller/orders')
export class SellerOrdersController {
  public constructor(
    private readonly queries: OrderQueryService,
    private readonly fulfilment: FulfilmentService,
  ) {}

  @Get()
  @ApiZodQuery(listSellerOrdersQuerySchema)
  @ApiZodResponse(HttpStatus.OK, sellerOrderPageSchema)
  public list(
    @CurrentUser() seller: AuthenticatedUser,
    @Query(new ZodValidationPipe(listSellerOrdersQuerySchema)) query: ListSellerOrdersQuery,
  ): Promise<SellerOrderPage> {
    return this.queries.forSeller(seller.id, query);
  }

  @Post(':id/ship')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(HttpStatus.OK, sellerOrderViewSchema)
  public async ship(
    @CurrentUser() seller: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SellerOrderView> {
    return SellerOrdersController.part(await this.fulfilment.ship(seller.id, id), id);
  }

  @Post(':id/deliver')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(HttpStatus.OK, sellerOrderViewSchema)
  public async deliver(
    @CurrentUser() seller: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SellerOrderView> {
    return SellerOrdersController.part(await this.fulfilment.deliver(seller.id, id), id);
  }

  /** Only the seller's own part goes back — never the rest of the shopper's order. */
  private static part(order: Order, sellerOrderId: string): SellerOrderView {
    const part = order.sellerOrders.find((candidate) => candidate.id === sellerOrderId);
    if (part === undefined) throw new NotFoundError('Seller order', sellerOrderId);
    return OrderMapper.toSellerOrderView(part);
  }
}
