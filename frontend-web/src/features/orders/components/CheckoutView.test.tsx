import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, type ReactNode } from 'react';

import { CART_STORAGE_KEY } from '@/constants/cart.constant';
import { cartLineFixture } from '@/test-utils/cart.fixture';
import { orderFixture } from '@/test-utils/order.fixture';
import { renderSignedIn } from '@/test-utils/render-signed-in';

import { CheckoutView } from './CheckoutView';

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement('a', { href }, children),
  usePathname: () => '/checkout',
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
}));

const fillAndPlace = async (card = '4242 4242 4242 4242'): Promise<void> => {
  await userEvent.type(screen.getByLabelText('Card number'), card);
  await userEvent.click(screen.getByRole('button', { name: 'Place order' }));
};

describe('CheckoutView', () => {
  beforeEach(() => {
    nav.replace.mockClear();
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([cartLineFixture({ quantity: 2 })]),
    );
  });

  it('places the order with a retry key, clears the cart and opens the order', async () => {
    const { fetchMock } = renderSignedIn(<CheckoutView />, {
      routes: { 'POST /api/v1/orders': { status: 201, body: orderFixture() } },
    });

    expect(await screen.findByText('Hội An Lights')).toBeInTheDocument();
    await fillAndPlace();

    await vi.waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith(`/orders/${orderFixture().id}`),
    );
    const request = fetchMock.mock.calls
      .map(([call]) => call as Request)
      .find((call) => call.method === 'POST' && call.url.endsWith('/api/v1/orders'))!;
    expect(request.headers.get('authorization')).toBe('Bearer test-access-token');
    expect(request.headers.get('idempotency-key')).toMatch(/^[\w-]{36}$/);
    expect(await request.clone().json()).toEqual({
      lines: [{ productSlug: 'silk-lantern', variantSku: 'LAN-RED', quantity: 2 }],
      card: { number: '4242424242424242' },
    });
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });

  it('lists what changed in the cart and keeps the same key for a retry', async () => {
    const { fetchMock } = renderSignedIn(<CheckoutView />, {
      routes: {
        'POST /api/v1/orders': {
          status: 409,
          body: {
            code: 'CART_CHANGED',
            message: 'dev',
            status: 409,
            details: {
              lines: [
                {
                  productSlug: 'silk-lantern',
                  variantSku: 'LAN-RED',
                  quantity: 2,
                  available: false,
                  problem: 'INSUFFICIENT_STOCK',
                  stock: 1,
                },
              ],
            },
          },
        },
      },
    });

    await screen.findByText('Hội An Lights');
    await fillAndPlace();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Some items in your cart changed');
    expect(alert).toHaveTextContent('Silk lantern: only 1 left');
    expect(screen.getByRole('link', { name: 'Review your cart' })).toHaveAttribute('href', '/cart');

    await userEvent.click(screen.getByRole('button', { name: 'Place order' }));
    const keys = fetchMock.mock.calls
      .map(([request]) => request as Request)
      .filter((request) => request.method === 'POST' && request.url.endsWith('/api/v1/orders'))
      .map((request) => request.headers.get('idempotency-key'));
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(1);
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('invites to browse when the cart is empty', async () => {
    window.localStorage.clear();
    renderSignedIn(<CheckoutView />);
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  });
});
