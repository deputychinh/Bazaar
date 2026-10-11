import { Module } from '@nestjs/common';

import { ImageUrlBuilder } from '../../common/storage/image-url.builder.js';
import { ObjectStorage } from '../../common/storage/object-storage.js';
import { S3ObjectStorage } from '../../common/storage/s3-object-storage.js';
import { PrismaTransactionManager } from '../../common/transaction/prisma-transaction-manager.js';
import { TransactionManager } from '../../common/transaction/transaction-manager.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { ShopsModule } from '../shops/shops.module.js';

import { AdminProductsController } from './controllers/admin-products.controller.js';
import { ProductsController } from './controllers/products.controller.js';
import { SellerProductImagesController } from './controllers/seller-product-images.controller.js';
import { SellerProductsController } from './controllers/seller-products.controller.js';
import { PrismaProductsRepository } from './repositories/prisma-products.repository.js';
import { ProductsRepository } from './repositories/products.repository.js';
import { ProductEvents } from './services/product-events.js';
import { ProductImagesService } from './services/product-images.service.js';
import { ProductModerationService } from './services/product-moderation.service.js';
import { ProductPresenter } from './services/product-presenter.js';
import { ProductQueryService } from './services/product-query.service.js';
import { SellerProductsService } from './services/seller-products.service.js';

@Module({
  imports: [CategoriesModule, ShopsModule],
  controllers: [
    ProductsController,
    SellerProductsController,
    SellerProductImagesController,
    AdminProductsController,
  ],
  providers: [
    ProductQueryService,
    ProductPresenter,
    ProductEvents,
    SellerProductsService,
    ProductModerationService,
    ProductImagesService,
    { provide: ObjectStorage, useClass: S3ObjectStorage },
    ImageUrlBuilder,
    { provide: TransactionManager, useClass: PrismaTransactionManager },
    { provide: ProductsRepository, useClass: PrismaProductsRepository },
  ],
})
export class ProductsModule {}
