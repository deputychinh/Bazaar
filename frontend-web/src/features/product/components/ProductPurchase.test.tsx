import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CART_STORAGE_KEY } from '@/constants/cart.constant';
import { productFixture } from '@/test-utils/product.fixture';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { ProductPurchase } from './ProductPurchase';

const product = {
  productSlug: 'silk-lantern',
  title: { en: 'Silk lantern' },
  imageUrl: null,
  shop: { slug: 'hoi-an-lights', name: 'Hội An Lights' },
};

describe('ProductPurchase', () => {
  beforeEach(() => window.localStorage.clear());

  it('opens on a variant in stock and warns when stock is low', () => {
    renderWithProviders(<ProductPurchase product={product} variants={productFixture().variants} />);

    expect(screen.getByRole('radio', { name: 'Red' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Blue' })).toBeDisabled();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('Only 3 left')).toBeInTheDocument();
  });

  it('adds the chosen variant to the cart', async () => {
    const variants = [
      { sku: 'S', priceUsdCents: 1000, stock: 20, attributes: { size: 'S' } },
      { sku: 'L', priceUsdCents: 1200, stock: 20, attributes: { size: 'L' } },
    ];
    renderWithProviders(<ProductPurchase product={product} variants={variants} />);

    await userEvent.click(screen.getByRole('radio', { name: 'L' }));
    expect(screen.getByText('$12.00')).toBeInTheDocument();
    expect(screen.getByText('In stock')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }));

    expect(screen.getByRole('status')).toHaveTextContent('Added to your cart.');
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([
      expect.objectContaining({
        sku: 'L',
        quantity: 1,
        unitPriceUsdCents: 1200,
        variantLabel: 'L',
        maxQuantity: 20,
      }),
    ]);
  });

  it('cannot add a sold-out variant and says when nothing is available', () => {
    const { unmount } = renderWithProviders(
      <ProductPurchase product={product} variants={[productFixture().variants[1]!]} />,
    );
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sold out' })).toBeDisabled();
    unmount();

    renderWithProviders(<ProductPurchase product={product} variants={[]} />);
    expect(screen.getByText('This product is not available right now.')).toBeInTheDocument();
  });
});
