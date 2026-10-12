import { Module } from '@nestjs/common';

import { PrismaTransactionManager } from '../../common/transaction/prisma-transaction-manager.js';
import { TransactionManager } from '../../common/transaction/transaction-manager.js';
import { PrismaProcessedEventStore } from '../events/prisma-processed-event.store.js';
import { PrismaProductsRepository } from '../products/repositories/prisma-products.repository.js';
import { ProductsRepository } from '../products/repositories/products.repository.js';

import { ProductReviewsController } from './controllers/product-reviews.controller.js';
import { SellerOrderDeliveredHandler } from './events/seller-order-delivered.handler.js';
import { PrismaReviewsRepository } from './repositories/prisma-reviews.repository.js';
import { ReviewsRepository } from './repositories/reviews.repository.js';
import { ReviewsService } from './services/reviews.service.js';

@Module({
  controllers: [ProductReviewsController],
  providers: [
    ReviewsService,
    SellerOrderDeliveredHandler,
    PrismaProcessedEventStore,
    { provide: ReviewsRepository, useClass: PrismaReviewsRepository },
    { provide: ProductsRepository, useClass: PrismaProductsRepository },
    { provide: TransactionManager, useClass: PrismaTransactionManager },
  ],
  exports: [SellerOrderDeliveredHandler],
})
export class ReviewsModule {}
