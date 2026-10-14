import { Module } from '@nestjs/common';

import { PrismaProcessedEventStore } from '../events/prisma-processed-event.store.js';

import { OrderCancelledHandler } from './events/order-cancelled.handler.js';
import { OrderConfirmedHandler } from './events/order-confirmed.handler.js';
import { OrderCreatedHandler } from './events/order-created.handler.js';
import { SellerOrderCancelledHandler } from './events/seller-order-cancelled.handler.js';
import { PrismaStockRepository } from './repositories/prisma-stock.repository.js';
import { StockRepository } from './repositories/stock.repository.js';
import { StockReservationService } from './services/stock-reservation.service.js';

@Module({
  providers: [
    StockReservationService,
    PrismaProcessedEventStore,
    OrderCreatedHandler,
    OrderCancelledHandler,
    OrderConfirmedHandler,
    SellerOrderCancelledHandler,
    { provide: StockRepository, useClass: PrismaStockRepository },
  ],
  exports: [
    OrderCreatedHandler,
    OrderCancelledHandler,
    OrderConfirmedHandler,
    SellerOrderCancelledHandler,
  ],
})
export class StockModule {}
