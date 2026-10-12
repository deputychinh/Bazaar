import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Locale } from '@/api/gateway.schema';
import { CancelReason, OrderStatus, PaymentStatus, SellerOrderStatus } from '@/api/order.schema';
import { orderFixture } from '@/test-utils/order.fixture';
import { renderSignedIn } from '@/test-utils/render-signed-in';

import { OrderDetail } from './OrderDetail';

const ID = orderFixture().id;

describe('OrderDetail', () => {
  it('follows the saga until the order is confirmed, then stops asking', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const answers = [
      orderFixture({ status: OrderStatus.PENDING }),
      orderFixture({ status: OrderStatus.RESERVED }),
      orderFixture(),
    ];
    const { fetchMock } = renderSignedIn(<OrderDetail orderId={ID} />, {
      routes: {
        [`GET /api/v1/orders/${ID}`]: () => ({
          status: 200,
          body: answers.shift() ?? orderFixture(),
        }),
      },
    });

    expect(await screen.findByText('We are reserving your items…')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(await screen.findByText('Items reserved. Charging your card…')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(2_000));
    expect(
      await screen.findByText('Confirmed. The shops are preparing your items.'),
    ).toBeInTheDocument();

    const calls = fetchMock.mock.calls.length;
    expect(calls).toBeGreaterThan(3);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(fetchMock.mock.calls.length).toBe(calls);
    vi.useRealTimers();
  });

  it('reloads the order when the live stream says it changed, without polling', async () => {
    let served = 0;
    renderSignedIn(<OrderDetail orderId={ID} />, {
      routes: {
        [`GET /api/v1/orders/${ID}`]: () => ({
          status: 200,
          body: served++ === 0 ? orderFixture({ status: OrderStatus.PENDING }) : orderFixture(),
        }),
        'GET /api/v1/orders/stream': {
          status: 200,
          contentType: 'text/event-stream',
          text: `event: order\ndata: ${JSON.stringify({ orderId: ID, type: 'OrderConfirmed', occurredAt: '' })}\n\n`,
        },
      },
    });

    expect(
      await screen.findByText('Confirmed. The shops are preparing your items.'),
    ).toBeInTheDocument();
  });

  it('explains a cancellation in the shopper’s language', async () => {
    renderSignedIn(<OrderDetail orderId={ID} />, {
      routes: {
        [`GET /api/v1/orders/${ID}`]: {
          status: 200,
          body: orderFixture({
            status: OrderStatus.CANCELLED,
            cancelReason: CancelReason.PAYMENT_FAILED,
            payment: { status: PaymentStatus.FAILED, cardLast4: '0002' },
          }),
        },
      },
      locale: Locale.vi,
    });

    expect(await screen.findByText(/thanh toán không thành công/)).toBeInTheDocument();
    expect(screen.getByText(/Thẻ đuôi 0002 · không bị trừ tiền/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Huỷ/ })).not.toBeInTheDocument();
  });

  it('cancels a confirmed seller order', async () => {
    const cancelled = orderFixture();
    cancelled.sellerOrders[0]!.status = SellerOrderStatus.CANCELLED;
    renderSignedIn(<OrderDetail orderId={ID} />, {
      routes: {
        [`GET /api/v1/orders/${ID}`]: { status: 200, body: orderFixture() },
        [`POST /api/v1/orders/${ID}/seller-orders/so-1/cancel`]: { status: 200, body: cancelled },
      },
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel these items' }));

    expect(
      await screen.findByText('Cancelled', { selector: '.order-status-badge' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel these items' })).not.toBeInTheDocument();
  });

  it('shows a translated error when the order cannot be loaded', async () => {
    renderSignedIn(<OrderDetail orderId={ID} />, {
      routes: {
        [`GET /api/v1/orders/${ID}`]: {
          status: 404,
          body: { code: 'NOT_FOUND', message: 'x', status: 404 },
        },
      },
    });
    expect(
      await screen.findByText('We could not find what you were looking for.'),
    ).toBeInTheDocument();
  });
});
