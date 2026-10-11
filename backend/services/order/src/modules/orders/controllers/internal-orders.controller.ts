import {
  type CreateOrderRequest,
  createOrderRequestSchema,
  type OrderView,
} from '@bazaar/contracts';
import {
  type AuthenticatedUser,
  CurrentUser,
  Internal,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

import { OrderMapper } from '../mappers/order.mapper.js';
import { CheckoutService } from '../services/checkout.service.js';

/**
 * Gateway checkout only: lines arrive priced by the catalog quote, so they are trusted only with
 * the internal key. The shopper is whoever the forwarded access token says.
 */
@Internal()
@ApiExcludeController()
@Controller('internal/orders')
export class InternalOrdersController {
  public constructor(private readonly checkout: CheckoutService) {}

  @Post()
  public async create(
    @CurrentUser() shopper: AuthenticatedUser,
    @Body(new ZodValidationPipe(createOrderRequestSchema)) body: CreateOrderRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<OrderView> {
    const result = await this.checkout.checkout(shopper.id, body);
    // 201 for a new order, 200 when an earlier request with the same key is replayed.
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return OrderMapper.toView(result.order);
  }
}
