import {
  type CheckoutRequest,
  cartChangedProblemSchema,
  checkoutRequestSchema,
  IDEMPOTENCY_KEY_HEADER,
  idempotencyKeySchema,
  type OrderView,
  orderViewSchema,
} from '@bazaar/contracts';
import {
  ApiZodBody,
  ApiZodResponse,
  ValidationError,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import { Body, Controller, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CheckoutService } from '../services/checkout.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class CheckoutController {
  public constructor(private readonly checkout: CheckoutService) {}

  /** Places an order from the cart. Retrying with the same Idempotency-Key returns the same order. */
  @Post()
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: '8–64 letters, digits, _ or -; one order per key and shopper',
  })
  @ApiZodBody(checkoutRequestSchema)
  @ApiZodResponse(
    HttpStatus.CREATED,
    orderViewSchema,
    'Order placed (PENDING); the saga takes over',
  )
  @ApiZodResponse(HttpStatus.OK, orderViewSchema, 'Replay of an earlier request with the same key')
  @ApiZodResponse(HttpStatus.CONFLICT, cartChangedProblemSchema, 'Cart lines to fix (CART_CHANGED)')
  public async place(
    @Body(new ZodValidationPipe(checkoutRequestSchema)) body: CheckoutRequest,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<OrderView> {
    const key = idempotencyKeySchema.safeParse(request.headers[IDEMPOTENCY_KEY_HEADER]);
    if (!key.success) {
      throw new ValidationError('Idempotency-Key header is required', {
        fields: { 'Idempotency-Key': key.error.issues[0]?.message ?? 'required' },
      });
    }
    // The access token guard has already verified this header.
    const result = await this.checkout.checkout(
      body,
      key.data,
      request.headers.authorization ?? '',
    );
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result.order;
  }
}
