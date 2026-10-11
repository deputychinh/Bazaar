import type { LocalizedText } from '@bazaar/contracts';

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
  parentId: string | null;
  path: string;
  sortOrder: number;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}
