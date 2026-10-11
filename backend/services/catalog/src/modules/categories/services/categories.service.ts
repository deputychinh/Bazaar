import { NotFoundError } from '@bazaar/nest-common';
import { Injectable } from '@nestjs/common';

import type { CategoryNode } from '../../../interfaces/category.interface.js';
import { CategoryTree } from '../domain/category-tree.js';
import { CategoriesRepository } from '../repositories/categories.repository.js';

@Injectable()
export class CategoriesService {
  public constructor(private readonly categories: CategoriesRepository) {}

  public async tree(): Promise<CategoryNode[]> {
    return CategoryTree.build(await this.categories.findAll());
  }

  public async assertExists(id: string): Promise<void> {
    if (!(await this.categories.findAll()).some((category) => category.id === id)) {
      throw new NotFoundError('Category', id);
    }
  }

  /** Ids of the category with this slug and all its sub-categories. */
  public async idsForSlug(slug: string): Promise<string[]> {
    const all = await this.categories.findAll();
    const category = all.find((candidate) => candidate.slug === slug);
    if (category === undefined) {
      throw new NotFoundError('Category', slug);
    }
    return CategoryTree.withDescendants(category, all);
  }
}
