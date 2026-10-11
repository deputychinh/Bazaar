import { screen } from '@testing-library/react';

import { Locale } from '@/api/gateway.schema';
import type { ProductSummary } from '@/interfaces/catalog.interface';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { ProductCard } from './ProductCard';

const product: ProductSummary = {
  id: 'p1',
  slug: 'non-la-1',
  title: { en: 'Conical hat', vi: 'Nón lá' },
  minPriceUsdCents: 1500,
  imageUrl: 'http://127.0.0.1:9002/bazaar-images/a.webp',
  rating: { average: 4.6, count: 12 },
  inStock: true,
};

describe('ProductCard', () => {
  it('links to the product with the title in the visitor’s language', () => {
    renderWithProviders(<ProductCard product={product} />, { locale: Locale.vi });

    expect(screen.getByRole('link', { name: /Nón lá/ })).toHaveAttribute('href', '/p/non-la-1');
    expect(screen.getByLabelText(/đánh giá 4.6 trên 5/)).toBeInTheDocument();
  });

  it('marks sold-out products and copes without an image or ratings', () => {
    renderWithProviders(
      <ProductCard
        product={{ ...product, inStock: false, imageUrl: null, rating: { average: 0, count: 0 } }}
      />,
    );

    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });
});
