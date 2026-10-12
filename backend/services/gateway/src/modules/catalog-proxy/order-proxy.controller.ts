import { Public } from '@bazaar/nest-common';
import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AppConfig } from '../../config/app-config.js';
import { ORDER_ROUTES } from '../../constants/gateway.constant.js';

import { ProxyForwarder } from './proxy-forwarder.js';

/**
 * Order routes through the gateway (shopper orders, seller fulfilment). The order service
 * verifies the forwarded token itself. Documented by backend/openapi/order.json.
 */
@Public()
@ApiExcludeController()
@Controller()
export class OrderProxyController {
  public constructor(
    private readonly proxy: ProxyForwarder,
    private readonly config: AppConfig,
  ) {}

  /** Only GET on the collection: POST /orders is checkout (CheckoutController). */
  @Get('orders')
  public list(@Req() request: Request, @Res() response: Response): Promise<void> {
    return this.proxy.forward(this.config.env.ORDER_SERVICE_URL, request, response);
  }

  @All(ORDER_ROUTES)
  public forward(@Req() request: Request, @Res() response: Response): Promise<void> {
    return this.proxy.forward(this.config.env.ORDER_SERVICE_URL, request, response);
  }
}
