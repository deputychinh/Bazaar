import { screen } from '@testing-library/react';

import { ProductSort } from '@/api/catalog.schema';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { CatalogFilters } from './CatalogFilters';

describe('CatalogFilters', () => {
  it('is a GET form pre-filled from the query that keeps the search text and sort', () => {
    const { container } = renderWithProviders(
      <CatalogFilters
        action="/search"
        query={{ q: 'gốm', minPrice: 1250, sort: ProductSort.rating }}
      />,
    );

    expect(screen.getByLabelText('Min price (USD)')).toHaveValue(12.5);
    expect(container.querySelector('input[type="hidden"][name="q"]')).toHaveValue('gốm');
    expect(container.querySelector('input[type="hidden"][name="sort"]')).toHaveValue('rating');
    expect(screen.getByRole('link', { name: 'Clear all' })).toHaveAttribute(
      'href',
      '/search?q=g%E1%BB%91m&sort=rating',
    );
  });

  it('links each rating filter and marks the current one', () => {
    renderWithProviders(<CatalogFilters action="/c/silk" query={{ minRating: 4 }} />);

    expect(screen.getByRole('link', { name: '4★ and up' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: '3★ and up' })).toHaveAttribute(
      'href',
      '/c/silk?minRating=3',
    );
  });
});
