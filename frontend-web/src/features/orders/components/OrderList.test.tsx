import { screen } from '@testing-library/react';

import { orderFixture } from '@/test-utils/order.fixture';
import { renderSignedIn } from '@/test-utils/render-signed-in';

import { OrderList } from './OrderList';

describe('OrderList', () => {
  it('lists the shopper’s orders with status and item count', async () => {
    const { fetchMock } = renderSignedIn(<OrderList page={2} />, {
      routes: {
        'GET /api/v1/orders': {
          status: 200,
          body: { items: [orderFixture()], total: 1, page: 2, pageSize: 20 },
        },
      },
    });

    const link = await screen.findByRole('link', { name: /2 items/ });
    expect(link).toHaveAttribute('href', `/orders/${orderFixture().id}`);
    expect(link).toHaveTextContent('Confirmed');
    const list = fetchMock.mock.calls
      .map(([call]) => call as Request)
      .find((call) => call.method === 'GET' && call.url.includes('/api/v1/orders'));
    expect(new URL(list?.url ?? 'http://x').searchParams.get('page')).toBe('2');
  });

  it('invites to shop when there are no orders', async () => {
    renderSignedIn(<OrderList page={1} />, {
      routes: {
        'GET /api/v1/orders': { status: 200, body: { items: [], total: 0, page: 1, pageSize: 20 } },
      },
    });
    expect(
      await screen.findByRole('heading', { name: 'You have no orders yet' }),
    ).toBeInTheDocument();
  });
});
