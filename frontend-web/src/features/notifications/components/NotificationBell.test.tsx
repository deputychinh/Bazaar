import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NotificationKind } from '@/api/notification.schema';
import { renderSignedIn } from '@/test-utils/render-signed-in';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { NotificationBell } from './NotificationBell';

const page = {
  items: [
    {
      id: 'n1',
      kind: NotificationKind.ORDER_CONFIRMED,
      data: { orderId: 'o1', orderReference: 'ABCD1234' },
      readAt: null,
      createdAt: new Date().toISOString(),
    },
  ],
  total: 1,
  unread: 1,
  page: 1,
  pageSize: 8,
};

describe('NotificationBell', () => {
  it('shows nothing to visitors', () => {
    const { container } = renderWithProviders(<NotificationBell />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the unread count, lists notifications and marks them read on open', async () => {
    const { fetchMock } = renderSignedIn(<NotificationBell />, {
      routes: {
        'GET /api/v1/notifications': { status: 200, body: page },
        'POST /api/v1/notifications/read-all': { status: 204 },
      },
    });

    const bell = await screen.findByRole('button', { name: 'Notifications, 1 unread' });
    await userEvent.click(bell);

    expect(screen.getByRole('link', { name: 'Order #ABCD1234 is confirmed' })).toHaveAttribute(
      'href',
      '/orders/o1',
    );
    expect(await screen.findByRole('button', { name: 'Notifications' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(fetchMock.mock.calls.some(([call]) => (call as Request).url.endsWith('/read-all'))).toBe(
      true,
    );
  });

  it('says when there is nothing yet', async () => {
    renderSignedIn(<NotificationBell />, {
      routes: {
        'GET /api/v1/notifications': {
          status: 200,
          body: { ...page, items: [], unread: 0, total: 0 },
        },
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
  });
});
