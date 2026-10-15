import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { server } from '@/test-utils/msw-server';
import { renderApp } from '@/test-utils/render-app';
import { signedInAs } from '@/test-utils/session';

const daily = [
  { date: '2026-10-10', orders: 2, usdCents: 3000 },
  { date: '2026-10-11', orders: 1, usdCents: 1250 },
];

describe('dashboards', () => {
  // The chart spans the 30 days up to today; pin today so the fixtures stay inside it.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('show a seller their sales, orders and what waits to ship', async () => {
    signedInAs('SELLER');
    server.use(http.get('*/api/v1/seller/stats', () => HttpResponse.json({ daily, toShip: 2 })));
    renderApp('/seller');

    expect(await screen.findByText('$42.50')).toBeInTheDocument();
    expect(screen.getByText('Waiting to ship').nextSibling).toHaveTextContent('2');
    expect(screen.getByRole('link', { name: 'Ship waiting orders' })).toHaveAttribute(
      'href',
      '/seller/orders',
    );
    expect(screen.getByText(/Oct 11, 2026: \$12\.50/, { selector: 'li' })).toBeInTheDocument();
  });

  it('show admins GMV, orders by status and top sellers', async () => {
    signedInAs('ADMIN');
    server.use(
      http.get('*/api/v1/admin/stats', () =>
        HttpResponse.json({
          daily,
          byStatus: { CONFIRMED: 3, CANCELLED: 1 },
          topSellers: [{ sellerId: 's1', shopName: 'Lụa Lan', orders: 4, usdCents: 17161 }],
        }),
      ),
    );
    renderApp('/platform');

    expect(await screen.findByRole('cell', { name: 'Lụa Lan' })).toBeInTheDocument();
    expect(screen.getByText('Confirmed').nextSibling).toHaveTextContent('3');
    expect(screen.getByText('$171.61')).toBeInTheDocument();
  });

  it('offer a retry when figures cannot load', async () => {
    signedInAs('SELLER');
    server.use(
      http.get('*/api/v1/seller/stats', () =>
        HttpResponse.json(
          { code: 'UPSTREAM_UNAVAILABLE', message: 'x', status: 502 },
          { status: 502 },
        ),
      ),
    );
    renderApp('/seller');
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
