import type { Category } from '../../../interfaces/category.interface.js';

export abstract class CategoriesRepository {
  public abstract findAll(): Promise<Category[]>;
}
