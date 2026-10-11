import { screen } from '@testing-library/react';

import { Locale } from '@/api/gateway.schema';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { CategoryNav } from './CategoryNav';

const tree = [
  {
    id: 'c1',
    slug: 'crafts',
    name: { en: 'Arts & Crafts', vi: 'Thủ công mỹ nghệ' },
    children: [{ id: 'c2', slug: 'silk', name: { en: 'Silk', vi: 'Lụa' }, children: [] }],
  },
];

describe('CategoryNav', () => {
  it('lists categories and sub-categories in the visitor’s language and marks the current one', () => {
    renderWithProviders(<CategoryNav categories={tree} currentSlug="silk" />, {
      locale: Locale.vi,
    });

    expect(screen.getByRole('link', { name: 'Thủ công mỹ nghệ' })).toHaveAttribute(
      'href',
      '/c/crafts',
    );
    expect(screen.getByRole('link', { name: 'Lụa' })).toHaveAttribute('aria-current', 'page');
  });
});
