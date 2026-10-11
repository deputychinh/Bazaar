import { type OrderView, orderViewSchema } from '@bazaar/contracts';
import {
  ApiZodQuery,
  ApiZodResponse,
  type AuthenticatedUser,
  CurrentUser,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { OrderMapper } from '../../orders/mappers/order.mapper.js';
import {
  type ListOrdersQuery,
  listOrdersQuerySchema,
  type OrderPage,
  orderPageSchema,
} from '../dto/orders.dto.js';
import { FulfilmentService } from '../services/fulfilment.service.js';
import { OrderQueryService } from '../services/order-query.service.js';

/** The signed-in shopper's own orders (placing one is POST /orders on the gateway). */
@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  public constructor(
    private readonly queries: OrderQueryService,
    private readonly fulfilment: FulfilmentService,
  ) {}

  @Get()
  @ApiZodQuery(listOrdersQuerySchema)
  @ApiZodResponse(HttpStatus.OK, orderPageSchema)
  public list(
    @CurrentUser() shopper: AuthenticatedUser,
    @Query(new ZodValidationPipe(listOrdersQuerySchema)) query: ListOrdersQuery,
  ): Promise<OrderPage> {
    return this.queries.mine(shopper.id, query);
  }

  @Get(':id')
  @ApiZodResponse(HttpStatus.OK, orderViewSchema)
  public one(
    @CurrentUser() shopper: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<OrderView> {
    return this.queries.one(shopper.id, id);
  }

  /** Cancels one seller's part before it ships; its stock is released and a refund is owed. */
  @Post(':id/seller-orders/:sellerOrderId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiZodResponse(HttpStatus.OK, orderViewSchema)
  public async cancelPart(
    @CurrentUser() shopper: AuthenticatedUser,
    @Param('id') id: string,
    @Param('sellerOrderId') sellerOrderId: string,
  ): Promise<OrderView> {
    const order = await this.fulfilment.cancelByShopper(shopper.id, id, sellerOrderId);
    return OrderMapper.toView(order);
  }
}
