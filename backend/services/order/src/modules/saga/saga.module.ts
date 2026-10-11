import { Module } from '@nestjs/common';

import { OrdersModule } from '../orders/orders.module.js';

import { EventConsumerRunner } from './event-consumer.runner.js';
import { StockRejectedHandler } from './events/stock-rejected.handler.js';
import { StockReservedHandler } from './events/stock-reserved.handler.js';
import { OrderSagaService } from './services/order-saga.service.js';
import { PaymentSettlementService } from './services/payment-settlement.service.js';

@Module({
  imports: [OrdersModule],
  providers: [
    OrderSagaService,
    PaymentSettlementService,
    StockReservedHandler,
    StockRejectedHandler,
    EventConsumerRunner,
  ],
  exports: [OrderSagaService, PaymentSettlementService],
})
export class SagaModule {}
