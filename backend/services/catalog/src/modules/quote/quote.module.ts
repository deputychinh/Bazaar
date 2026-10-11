import { Module } from '@nestjs/common';

import { ImageUrlBuilder } from '../../common/storage/image-url.builder.js';
import { PrismaProductsRepository } from '../products/repositories/prisma-products.repository.js';
import { ProductsRepository } from '../products/repositories/products.repository.js';
import { ShopsModule } from '../shops/shops.module.js';

import { InternalQuoteController } from './controllers/internal-quote.controller.js';
import { QuoteService } from './services/quote.service.js';

@Module({
  imports: [ShopsModule],
  controllers: [InternalQuoteController],
  providers: [
    QuoteService,
    ImageUrlBuilder,
    { provide: ProductsRepository, useClass: PrismaProductsRepository },
  ],
})
export class QuoteModule {}
