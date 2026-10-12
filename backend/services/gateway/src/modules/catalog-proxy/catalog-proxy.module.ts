import { Module } from '@nestjs/common';

import { CatalogProxyController } from './catalog-proxy.controller.js';
import { NotificationProxyController } from './notification-proxy.controller.js';
import { OrderProxyController } from './order-proxy.controller.js';
import { ProxyForwarder } from './proxy-forwarder.js';
import { UpstreamClient } from './upstream-client.js';

@Module({
  controllers: [CatalogProxyController, OrderProxyController, NotificationProxyController],
  providers: [UpstreamClient, ProxyForwarder],
})
export class CatalogProxyModule {}
