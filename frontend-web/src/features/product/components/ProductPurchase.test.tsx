import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { productFixture } from '@/test-utils/product.fixture';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { ProductPurchase } from './ProductPurchase';

describe('ProductPurchase', () => {
  it('opens on a variant in stock and warns when stock is low', () => {
    renderWithProviders(<ProductPurchase variants={productFixture().variants} />);

    expect(screen.getByRole('radio', { name: 'Red' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Blue' })).toBeDisabled();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('Only 3 left')).toBeInTheDocument();
  });

  it('updates price and stock when another variant is chosen', async () => {
    const variants = [
      { sku: 'S', priceUsdCents: 1000, stock: 20, attributes: { size: 'S' } },
      { sku: 'L', priceUsdCents: 1200, stock: 20, attributes: { size: 'L' } },
    ];
    renderWithProviders(
      <ProductPurchase
        variants={variants}
        renderAction={(variant) => <span>chosen {variant.sku}</span>}
      />,
    );

    await userEvent.click(screen.getByRole('radio', { name: 'L' }));

    expect(screen.getByText('$12.00')).toBeInTheDocument();
    expect(screen.getByText('In stock')).toBeInTheDocument();
    expect(screen.getByText('chosen L')).toBeInTheDocument();
  });

  it('hides the picker for a single variant and says when nothing is available', () => {
    const { unmount } = renderWithProviders(
      <ProductPurchase variants={[productFixture().variants[1]!]} />,
    );
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    unmount();

    renderWithProviders(<ProductPurchase variants={[]} />);
    expect(screen.getByText('This product is not available right now.')).toBeInTheDocument();
  });
});
