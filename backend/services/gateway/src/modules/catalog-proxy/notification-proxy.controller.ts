import { Public } from '@bazaar/nest-common';
import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AppConfig } from '../../config/app-config.js';
import { NOTIFICATION_ROUTES } from '../../constants/gateway.constant.js';

import { ProxyForwarder } from './proxy-forwarder.js';

/** In-app notifications and the admin event log. Documented by backend/openapi/notification.json. */
@Public()
@ApiExcludeController()
@Controller()
export class NotificationProxyController {
  public constructor(
    private readonly proxy: ProxyForwarder,
    private readonly config: AppConfig,
  ) {}

  @All(NOTIFICATION_ROUTES)
  public forward(@Req() request: Request, @Res() response: Response): Promise<void> {
    return this.proxy.forward(this.config.env.NOTIFICATION_SERVICE_URL, request, response);
  }
}
