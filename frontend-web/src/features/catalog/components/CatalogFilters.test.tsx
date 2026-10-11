import { screen } from '@testing-library/react';

import { ProductSort } from '@/api/catalog.schema';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { CatalogFilters } from './CatalogFilters';

describe('CatalogFilters', () => {
  it('is a GET form pre-filled from the current query, prices shown in dollars', () => {
    renderWithProviders(
      <CatalogFilters
        action="/search"
        query={{ q: 'gốm', minPrice: 1250, sort: ProductSort.rating }}
      />,
    );

    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('gốm');
    expect(screen.getByLabelText('Min price (USD)')).toHaveValue(12.5);
    expect(screen.getByLabelText('Sort by')).toHaveValue('rating');
  });

  it('offers relevance only when there is a search text', () => {
    renderWithProviders(<CatalogFilters action="/search" query={{}} />);

    expect(screen.queryByRole('option', { name: 'Best match' })).not.toBeInTheDocument();
  });
});
