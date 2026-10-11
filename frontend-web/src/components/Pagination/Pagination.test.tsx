import { screen } from '@testing-library/react';

import { renderWithProviders } from '@/test-utils/render-with-providers';

import { Pagination, pageWindow } from './Pagination';

describe('pageWindow', () => {
  it('keeps the first, last and nearby pages', () => {
    expect(pageWindow(10, 40)).toEqual([1, 8, 9, 10, 11, 12, 40]);
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });
});

describe('Pagination', () => {
  it('links pages with the current one marked', () => {
    renderWithProviders(
      <Pagination page={2} totalPages={5} hrefFor={(page) => `/search?page=${page}`} />,
    );

    expect(screen.getByRole('link', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/search?page=1',
    );
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/search?page=3');
  });

  it('renders nothing for a single page', () => {
    const { container } = renderWithProviders(
      <Pagination page={1} totalPages={1} hrefFor={() => '/'} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
