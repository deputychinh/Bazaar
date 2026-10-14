import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

import { METRICS_ROUTE } from '../constants/metrics.constant.js';
import { Public } from '../http/decorators/public.decorator.js';

import { MetricsRegistry } from './metrics.registry.js';

/** Prometheus scrape target. Public to the cluster only: the ingress never routes `/metrics`. */
@Public()
@ApiExcludeController()
@Controller(METRICS_ROUTE)
export class MetricsController {
  public constructor(private readonly registry: MetricsRegistry) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  public async scrape(@Res() response: Response): Promise<void> {
    response.type(this.registry.contentType).send(await this.registry.scrape());
  }
}
