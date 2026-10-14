import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '@/test-utils/msw-server';
import { renderApp } from '@/test-utils/render-app';
import { signedInAs } from '@/test-utils/session';

const sellerOrder = (status: string) => ({
  id: 'so-1',
  orderId: '01990000-0000-7000-9000-0000000000ab',
  sellerId: 'seller-1',
  shop: { id: 'shop-1', name: 'Shop' },
  status,
  subtotalUsdCents: 3000,
  cancelReason: null,
  shippedAt: null,
  deliveredAt: null,
  cancelledAt: null,
  createdAt: '2026-10-11T08:00:00.000Z',
  items: [
    {
      id: 'i1',
      productId: 'p1',
      productSlug: 'lantern',
      variantSku: 'LAN-RED',
      title: { en: 'Silk lantern' },
      variantLabel: { en: 'Red', vi: 'Đỏ' },
      imageUrl: null,
      quantity: 2,
      unitPriceUsdCents: 1500,
    },
  ],
});

describe('seller orders', () => {
  it('shows orders to ship and ships one', async () => {
    signedInAs('SELLER');
    let status = 'CONFIRMED';
    const asked: (string | null)[] = [];
    server.use(
      http.get('*/api/v1/seller/orders', ({ request }) => {
        const wanted = new URL(request.url).searchParams.get('status');
        asked.push(wanted);
        return HttpResponse.json({
          items: wanted === status ? [sellerOrder(status)] : [],
          total: wanted === status ? 1 : 0,
          page: 1,
          pageSize: 20,
        });
      }),
      http.post('*/api/v1/seller/orders/so-1/ship', () => {
        status = 'SHIPPED';
        return HttpResponse.json(sellerOrder('SHIPPED'));
      }),
    );
    renderApp('/seller/orders');

    expect(await screen.findByText('#000000AB')).toBeInTheDocument();
    expect(screen.getByText(/2 × Silk lantern \(LAN-RED\)/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mark as shipped' }));
    expect(await screen.findByText('Nothing here right now.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Shipped' }));
    expect(await screen.findByRole('button', { name: 'Mark as delivered' })).toBeInTheDocument();
    await waitFor(() => expect(asked).toContain('SHIPPED'));
  });

  it('explains a refused step', async () => {
    signedInAs('SELLER');
    server.use(
      http.get('*/api/v1/seller/orders', () =>
        HttpResponse.json({ items: [sellerOrder('CONFIRMED')], total: 1, page: 1, pageSize: 20 }),
      ),
      http.post('*/api/v1/seller/orders/so-1/ship', () =>
        HttpResponse.json(
          { code: 'INVALID_ORDER_TRANSITION', message: 'x', status: 409 },
          { status: 409 },
        ),
      ),
    );
    renderApp('/seller/orders');
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as shipped' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This order can no longer be changed.',
    );
  });
});
