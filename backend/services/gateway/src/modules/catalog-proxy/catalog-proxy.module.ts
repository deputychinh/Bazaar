import { Module } from '@nestjs/common';

import { CatalogProxyController } from './catalog-proxy.controller.js';
import { OrderProxyController } from './order-proxy.controller.js';
import { UpstreamClient } from './upstream-client.js';

@Module({
  controllers: [CatalogProxyController, OrderProxyController],
  providers: [UpstreamClient],
})
export class CatalogProxyModule {}
