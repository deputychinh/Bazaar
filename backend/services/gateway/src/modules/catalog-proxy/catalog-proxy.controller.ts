import { Public } from '@bazaar/nest-common';
import { All, Controller, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AppConfig } from '../../config/app-config.js';
import { CATALOG_ROUTES } from '../../constants/gateway.constant.js';

import { UpstreamClient } from './upstream-client.js';

/**
 * Catalog routes through the gateway: one public address for the frontends, rate limits at
 * the edge. Not authenticated here on purpose — the catalog verifies every token itself.
 * Documented by backend/openapi/catalog.json.
 */
@Public()
@ApiExcludeController()
@Controller()
export class CatalogProxyController {
  public constructor(
    private readonly upstream: UpstreamClient,
    private readonly config: AppConfig,
  ) {}

  @All(CATALOG_ROUTES)
  public async forward(@Req() request: Request, @Res() response: Response): Promise<void> {
    const answer = await this.upstream.forward(this.config.env.CATALOG_SERVICE_URL, {
      method: request.method,
      url: request.originalUrl,
      headers: {
        ...request.headers,
        'x-request-id':
          typeof request.id === 'string' ? request.id : request.headers['x-request-id'],
      },
      body: request.body as unknown,
    });
    response.status(answer.status).set(answer.headers).send(answer.body);
  }
}
