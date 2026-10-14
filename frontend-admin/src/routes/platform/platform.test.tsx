import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { ProductStatus } from '@/api/catalog.schema';
import { server } from '@/test-utils/msw-server';
import { sellerProductFixture } from '@/test-utils/product.fixture';
import { renderApp } from '@/test-utils/render-app';
import { signedInAs } from '@/test-utils/session';

const application = (status: string, rejectionReason: string | null = null) => ({
  id: 'app-1',
  userId: 'u-22',
  shopName: "Tom's Tools",
  status,
  rejectionReason,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
});

describe('platform admin', () => {
  beforeEach(() => signedInAs('ADMIN'));

  it('approves and rejects seller applications (a reason is required)', async () => {
    const decisions: string[] = [];
    server.use(
      http.get('*/api/v1/admin/seller-applications', () =>
        HttpResponse.json({ items: [application('PENDING')], total: 1, page: 1, pageSize: 20 }),
      ),
      http.post('*/api/v1/admin/seller-applications/app-1/approve', () => {
        decisions.push('approve');
        return HttpResponse.json(application('APPROVED'));
      }),
      http.post('*/api/v1/admin/seller-applications/app-1/reject', async ({ request }) => {
        decisions.push(`reject: ${((await request.json()) as { reason: string }).reason}`);
        return HttpResponse.json(application('REJECTED', 'No tax id'));
      }),
    );
    renderApp('/platform/sellers');

    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const confirm = screen.getAllByRole('button', { name: 'Reject' }).at(-1)!;
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason'), 'No tax id');
    await userEvent.click(confirm);

    await vi.waitFor(() => expect(decisions).toEqual(['approve', 'reject: No tax id']));
  });

  it('hides a product with a reason and restores a hidden one', async () => {
    const calls: string[] = [];
    server.use(
      http.get('*/api/v1/admin/products', ({ request }) => {
        calls.push(`list ${new URL(request.url).search}`);
        return HttpResponse.json({
          items: [
            sellerProductFixture({ id: 'p1', status: ProductStatus.PUBLISHED }),
            sellerProductFixture({
              id: 'p2',
              title: { en: 'Fake brand bag' },
              status: ProductStatus.HIDDEN,
              hiddenReason: 'Counterfeit',
            }),
          ],
          total: 2,
          page: 1,
          pageSize: 20,
        });
      }),
      http.post('*/api/v1/admin/products/p1/hide', () => {
        calls.push('hide p1');
        return HttpResponse.json(sellerProductFixture({ id: 'p1', status: ProductStatus.HIDDEN }));
      }),
      http.post('*/api/v1/admin/products/p2/restore', () => {
        calls.push('restore p2');
        return HttpResponse.json(sellerProductFixture({ id: 'p2' }));
      }),
    );
    renderApp('/platform/products');

    expect(await screen.findByText('Hidden: Counterfeit')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    await userEvent.type(screen.getByLabelText('Reason'), 'Misleading photos');
    await userEvent.click(screen.getAllByRole('button', { name: 'Hide' }).at(-1)!);

    await userEvent.type(screen.getByLabelText('Title contains'), 'bag');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await vi.waitFor(() =>
      expect(calls).toEqual(
        expect.arrayContaining(['restore p2', 'hide p1', 'list ?page=1&pageSize=20&q=bag']),
      ),
    );
  });

  it('shows the event log and filters it by aggregate', async () => {
    const searches: string[] = [];
    server.use(
      http.get('*/api/v1/admin/events', ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('aggregateId') ?? '');
        return HttpResponse.json({
          items: [
            {
              eventId: 'e1',
              type: 'OrderConfirmed',
              topic: 'order.events',
              aggregateId: 'o1',
              occurredAt: '2026-10-11T08:00:00.000Z',
              payload: { orderId: 'o1' },
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
        });
      }),
    );
    renderApp('/platform/events');

    expect(await screen.findByText('order.events · o1')).toBeInTheDocument();
    expect(screen.getByText('OrderConfirmed', { selector: 'strong' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Order or product id'), 'o1');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await vi.waitFor(() => expect(searches).toContain('o1'));
  });
});
