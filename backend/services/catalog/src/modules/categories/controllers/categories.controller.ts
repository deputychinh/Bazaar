import { ApiZodResponse, Public } from '@bazaar/nest-common';
import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import type { CategoryResponse } from '../../../interfaces/category-response.interface.js';
import { categoryResponseSchema } from '../dto/category.dto.js';
import { CategoryMapper } from '../mappers/category.mapper.js';
import { CategoriesService } from '../services/categories.service.js';

@ApiTags('catalog')
@Controller('categories')
export class CategoriesController {
  public constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  @ApiZodResponse(
    HttpStatus.OK,
    z.array(categoryResponseSchema),
    'Category tree, names in EN and VI',
  )
  public async tree(): Promise<CategoryResponse[]> {
    return (await this.categories.tree()).map((node) => CategoryMapper.toResponse(node));
  }
}
