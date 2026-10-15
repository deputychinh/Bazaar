import { screen } from '@testing-library/react';

import { ProductSort } from '@/api/catalog.schema';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { SortBar } from './SortBar';

describe('SortBar', () => {
  it('marks the default sort and offers relevance only when searching', () => {
    const { unmount } = renderWithProviders(
      <SortBar query={{}} pathname="/search" page={1} totalPages={1} />,
    );
    expect(screen.getByRole('link', { name: 'Newest' })).toHaveAttribute('aria-current', 'true');
    expect(screen.queryByRole('link', { name: 'Best match' })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(
      <SortBar query={{ q: 'lụa' }} pathname="/search" page={1} totalPages={1} />,
    );
    expect(screen.getByRole('link', { name: 'Best match' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('keeps the filters, resets the page and pages through results', () => {
    renderWithProviders(
      <SortBar
        query={{ minRating: 4, sort: ProductSort.rating, page: 2 }}
        pathname="/c/silk"
        page={2}
        totalPages={3}
      />,
    );

    expect(screen.getByRole('link', { name: 'Best selling' })).toHaveAttribute(
      'href',
      '/c/silk?minRating=4&sort=best_selling',
    );
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/c/silk?minRating=4&sort=rating',
    );
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/c/silk?minRating=4&sort=rating&page=3',
    );
  });
});
