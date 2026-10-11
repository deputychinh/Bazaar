import { Module } from '@nestjs/common';

import { CatalogProxyController } from './catalog-proxy.controller.js';
import { UpstreamClient } from './upstream-client.js';

@Module({
  controllers: [CatalogProxyController],
  providers: [UpstreamClient],
})
export class CatalogProxyModule {}
