import { Module } from '@nestjs/common';

import { PrismaProcessedEventStore } from '../events/prisma-processed-event.store.js';

import { SellerShopController } from './controllers/seller-shop.controller.js';
import { ShopsController } from './controllers/shops.controller.js';
import { SellerApprovedHandler } from './events/seller-approved.handler.js';
import { PrismaShopsRepository } from './repositories/prisma-shops.repository.js';
import { ShopsRepository } from './repositories/shops.repository.js';
import { ShopsService } from './services/shops.service.js';

@Module({
  controllers: [ShopsController, SellerShopController],
  providers: [
    ShopsService,
    SellerApprovedHandler,
    PrismaProcessedEventStore,
    { provide: ShopsRepository, useClass: PrismaShopsRepository },
  ],
  exports: [ShopsService, ShopsRepository, SellerApprovedHandler],
})
export class ShopsModule {}
