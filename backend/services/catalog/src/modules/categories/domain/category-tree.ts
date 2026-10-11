import type { Category, CategoryNode } from '../../../interfaces/category.interface.js';

/** Builds the nested tree and finds a category's descendants (by materialised path). */
export class CategoryTree {
  public static build(categories: readonly Category[]): CategoryNode[] {
    const nodes = new Map(
      categories.map((category) => [category.id, { ...category, children: [] as CategoryNode[] }]),
    );
    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId === null ? undefined : nodes.get(node.parentId);
      (parent?.children ?? roots).push(node);
    }
    const sort = (list: CategoryNode[]): CategoryNode[] =>
      list
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((node) => ({ ...node, children: sort(node.children) }));
    return sort(roots);
  }

  /** The category itself and everything below it. */
  public static withDescendants(category: Category, all: readonly Category[]): string[] {
    return all
      .filter(
        (candidate) =>
          candidate.path === category.path || candidate.path.startsWith(`${category.path}/`),
      )
      .map((candidate) => candidate.id);
  }
}
