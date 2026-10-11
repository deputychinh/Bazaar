import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { Category } from '../../../interfaces/category.interface.js';
import { CategoryMapper } from '../mappers/category.mapper.js';

import { CategoriesRepository } from './categories.repository.js';

@Injectable()
export class PrismaCategoriesRepository extends CategoriesRepository {
  public constructor(private readonly prisma: PrismaService) {
    super();
  }

  public async findAll(): Promise<Category[]> {
    const rows = await this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map((row) => CategoryMapper.toDomain(row));
  }
}
