import { category } from '../../../../test/fakes/catalog.fakes.js';

import { CategoryTree } from './category-tree.js';

const crafts = category({ id: 'c1', slug: 'crafts', path: '/crafts', sortOrder: 1 });
const books = category({ id: 'c2', slug: 'books', path: '/books', sortOrder: 0 });
const silk = category({
  id: 'c3',
  slug: 'silk',
  path: '/crafts/silk',
  parentId: 'c1',
  sortOrder: 1,
});
const ceramics = category({
  id: 'c4',
  slug: 'ceramics',
  path: '/crafts/ceramics',
  parentId: 'c1',
  sortOrder: 0,
});
const craftsman = category({ id: 'c5', slug: 'craftsman', path: '/craftsman' });

describe('CategoryTree', () => {
  it('nests children under parents, ordered by sortOrder', () => {
    const tree = CategoryTree.build([crafts, silk, books, ceramics]);

    expect(tree.map((node) => node.slug)).toEqual(['books', 'crafts']);
    expect(tree[1]?.children.map((node) => node.slug)).toEqual(['ceramics', 'silk']);
  });

  it('finds a category and its descendants, not look-alike paths', () => {
    expect(
      CategoryTree.withDescendants(crafts, [crafts, silk, ceramics, books, craftsman]).sort(),
    ).toEqual(['c1', 'c3', 'c4']);
  });
});
