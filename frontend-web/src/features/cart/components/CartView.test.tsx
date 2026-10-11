import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DisplayCurrency } from '@/api/gateway.schema';
import { CART_STORAGE_KEY } from '@/constants/cart.constant';
import { CURRENCY_COOKIE } from '@/constants/currency.constant';
import { cartLineFixture } from '@/test-utils/cart.fixture';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { CartLink } from './CartLink';
import { CartView } from './CartView';

const store = (lines: unknown[]): void =>
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));

describe('CartView', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = `${CURRENCY_COOKIE}=; max-age=0`;
  });

  it('invites the visitor to browse when the cart is empty', () => {
    renderWithProviders(<CartView />);
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse products' })).toHaveAttribute(
      'href',
      '/search',
    );
  });

  it('groups lines by shop with subtotals and one grand total', () => {
    store([
      cartLineFixture({ quantity: 2 }),
      cartLineFixture({
        sku: 'MUG',
        title: { en: 'Mug' },
        unitPriceUsdCents: 999,
        shop: { slug: 'bat-trang', name: 'Bát Tràng' },
      }),
    ]);
    renderWithProviders(
      <>
        <CartLink />
        <CartView />
      </>,
    );

    expect(screen.getByRole('link', { name: 'Cart, 3 items' })).toBeInTheDocument();
    const lights = screen.getByRole('region', { name: 'Hội An Lights' });
    expect(within(lights).getByText('Shop subtotal')).toHaveTextContent('$30.00');
    expect(screen.getByRole('complementary', { name: 'Order summary' })).toHaveTextContent(
      '$39.99',
    );
  });

  it('converts the summed USD total to VND once', () => {
    store([cartLineFixture({ unitPriceUsdCents: 333, quantity: 3 })]);
    document.cookie = `${CURRENCY_COOKIE}=${DisplayCurrency.VND}`;
    renderWithProviders(<CartView />, { usdToVnd: 25_000 });

    // 3 × $3.33 = $9.99 → 249,750 ₫ (not 3 × rounded 83,250).
    expect(screen.getByRole('complementary', { name: 'Order summary' })).toHaveTextContent(
      '≈ ₫249,750',
    );
  });

  it('changes quantities and removes lines', async () => {
    store([cartLineFixture({ quantity: 1, maxQuantity: 2 })]);
    renderWithProviders(<CartView />);

    const increase = screen.getByRole('button', { name: 'Increase quantity' });
    await userEvent.click(increase);
    expect(increase).toBeDisabled();
    expect(screen.getByRole('complementary', { name: 'Order summary' })).toHaveTextContent(
      '$30.00',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove Silk lantern from cart' }));
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });
});
