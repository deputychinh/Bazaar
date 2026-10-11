import { Module } from '@nestjs/common';

import { OrdersModule } from '../orders/orders.module.js';
import { SagaModule } from '../saga/saga.module.js';

import { OrdersController } from './controllers/orders.controller.js';
import { SellerOrdersController } from './controllers/seller-orders.controller.js';
import { FulfilmentService } from './services/fulfilment.service.js';
import { OrderQueryService } from './services/order-query.service.js';

@Module({
  imports: [OrdersModule, SagaModule],
  controllers: [OrdersController, SellerOrdersController],
  providers: [FulfilmentService, OrderQueryService],
})
export class FulfilmentModule {}
