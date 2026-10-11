import type { Category as CategoryRow } from '#prisma';

import type { CategoryResponse } from '../../../interfaces/category-response.interface.js';
import type { Category, CategoryNode } from '../../../interfaces/category.interface.js';

export class CategoryMapper {
  public static toDomain(row: CategoryRow): Category {
    return {
      id: row.id,
      slug: row.slug,
      name: { en: row.name.en, vi: row.name.vi ?? undefined },
      parentId: row.parentId,
      path: row.path,
      sortOrder: row.sortOrder,
    };
  }

  public static toResponse(node: CategoryNode): CategoryResponse {
    return {
      id: node.id,
      slug: node.slug,
      name: node.name,
      children: node.children.map((child) => CategoryMapper.toResponse(child)),
    };
  }
}
