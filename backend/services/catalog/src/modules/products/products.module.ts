import { Module } from '@nestjs/common';

import { ImageUrlBuilder } from '../../common/storage/image-url.builder.js';
import { PrismaTransactionManager } from '../../common/transaction/prisma-transaction-manager.js';
import { TransactionManager } from '../../common/transaction/transaction-manager.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { ShopsModule } from '../shops/shops.module.js';

import { AdminProductsController } from './controllers/admin-products.controller.js';
import { ProductsController } from './controllers/products.controller.js';
import { SellerProductsController } from './controllers/seller-products.controller.js';
import { PrismaProductsRepository } from './repositories/prisma-products.repository.js';
import { ProductsRepository } from './repositories/products.repository.js';
import { ProductEvents } from './services/product-events.js';
import { ProductModerationService } from './services/product-moderation.service.js';
import { ProductPresenter } from './services/product-presenter.js';
import { ProductQueryService } from './services/product-query.service.js';
import { SellerProductsService } from './services/seller-products.service.js';

@Module({
  imports: [CategoriesModule, ShopsModule],
  controllers: [ProductsController, SellerProductsController, AdminProductsController],
  providers: [
    ProductQueryService,
    ProductPresenter,
    ProductEvents,
    SellerProductsService,
    ProductModerationService,
    ImageUrlBuilder,
    { provide: TransactionManager, useClass: PrismaTransactionManager },
    { provide: ProductsRepository, useClass: PrismaProductsRepository },
  ],
})
export class ProductsModule {}
