import { Module } from '@nestjs/common';

import { OrdersModule } from '../orders/orders.module.js';

import { EventConsumerRunner } from './event-consumer.runner.js';
import { StockRejectedHandler } from './events/stock-rejected.handler.js';
import { StockReservedHandler } from './events/stock-reserved.handler.js';
import { OrderSweeperRunner } from './order-sweeper.runner.js';
import { OrderSagaService } from './services/order-saga.service.js';
import { OrderSweeperService } from './services/order-sweeper.service.js';
import { PaymentSettlementService } from './services/payment-settlement.service.js';

@Module({
  imports: [OrdersModule],
  providers: [
    OrderSagaService,
    PaymentSettlementService,
    StockReservedHandler,
    StockRejectedHandler,
    EventConsumerRunner,
    OrderSweeperService,
    OrderSweeperRunner,
  ],
  exports: [OrderSagaService, PaymentSettlementService],
})
export class SagaModule {}
