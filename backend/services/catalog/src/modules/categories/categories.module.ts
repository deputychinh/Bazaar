import { Module } from '@nestjs/common';

import { CategoriesController } from './controllers/categories.controller.js';
import { CategoriesRepository } from './repositories/categories.repository.js';
import { PrismaCategoriesRepository } from './repositories/prisma-categories.repository.js';
import { CategoriesService } from './services/categories.service.js';

@Module({
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    { provide: CategoriesRepository, useClass: PrismaCategoriesRepository },
  ],
  exports: [CategoriesService],
})
export class CategoriesModule {}
