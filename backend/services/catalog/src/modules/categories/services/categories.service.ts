import { CacheStore, NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import {
  CATEGORY_LIST_CACHE_KEY,
  CATEGORY_LIST_TTL_SECONDS,
} from '../../../constants/cache.constant.js';
import type { Category, CategoryNode } from '../../../interfaces/category.interface.js';
import { CategoryTree } from '../domain/category-tree.js';
import { CategoriesRepository } from '../repositories/categories.repository.js';

@Injectable()
export class CategoriesService {
  public constructor(
    private readonly categories: CategoriesRepository,
    private readonly cache: CacheStore,
  ) {}

  public async tree(): Promise<CategoryNode[]> {
    return CategoryTree.build(await this.all());
  }

  public async assertExists(id: string): Promise<void> {
    if (!(await this.all()).some((category) => category.id === id)) {
      throw new NotFoundError('Category', id);
    }
  }

  /** Ids of the category with this slug and all its sub-categories. */
  public async idsForSlug(slug: string): Promise<string[]> {
    const all = await this.all();
    const category = all.find((candidate) => candidate.slug === slug);
    if (category === undefined) {
      throw new NotFoundError('Category', slug);
    }
    return CategoryTree.withDescendants(category, all);
  }

  private all(): Promise<Category[]> {
    return this.cache.getOrSet(CATEGORY_LIST_CACHE_KEY, CATEGORY_LIST_TTL_SECONDS, () =>
      this.categories.findAll(),
    );
  }
}
