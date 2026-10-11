import { Module } from '@nestjs/common';

import { InternalOrdersController } from './controllers/internal-orders.controller.js';
import { OrdersRepository } from './repositories/orders.repository.js';
import { PrismaOrdersRepository } from './repositories/prisma-orders.repository.js';
import { CheckoutService } from './services/checkout.service.js';

@Module({
  controllers: [InternalOrdersController],
  providers: [CheckoutService, { provide: OrdersRepository, useClass: PrismaOrdersRepository }],
  exports: [OrdersRepository],
})
export class OrdersModule {}
