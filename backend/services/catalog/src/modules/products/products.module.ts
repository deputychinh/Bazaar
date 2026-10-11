import { Module } from '@nestjs/common';

import { ImageUrlBuilder } from '../../common/storage/image-url.builder.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { ShopsModule } from '../shops/shops.module.js';

import { ProductsController } from './controllers/products.controller.js';
import { PrismaProductsRepository } from './repositories/prisma-products.repository.js';
import { ProductsRepository } from './repositories/products.repository.js';
import { ProductPresenter } from './services/product-presenter.js';
import { ProductQueryService } from './services/product-query.service.js';

@Module({
  imports: [CategoriesModule, ShopsModule],
  controllers: [ProductsController],
  providers: [
    ProductQueryService,
    ProductPresenter,
    ImageUrlBuilder,
    { provide: ProductsRepository, useClass: PrismaProductsRepository },
  ],
})
export class ProductsModule {}
