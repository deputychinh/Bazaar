import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { ProductStatus } from '@/api/catalog.schema';
import { server } from '@/test-utils/msw-server';
import {
  categoriesFixture,
  fixtureCategoryId,
  sellerProductFixture,
} from '@/test-utils/product.fixture';
import { renderApp } from '@/test-utils/render-app';
import { signedInAs } from '@/test-utils/session';

const page = (items = [sellerProductFixture()]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
});

describe('seller products', () => {
  beforeEach(() => {
    signedInAs('SELLER');
    server.use(http.get('*/api/v1/categories', () => HttpResponse.json(categoriesFixture)));
  });

  it('lists products and filters by status through the URL', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get('*/api/v1/seller/products', ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('status'));
        return HttpResponse.json(page());
      }),
    );
    const { router } = renderApp('/seller/products');

    expect(await screen.findByRole('link', { name: 'Silk lantern' })).toHaveAttribute(
      'href',
      '/seller/products/b00000000000000000000001',
    );
    expect(screen.getByText('Draft', { selector: '.status-badge' })).toBeInTheDocument();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Status' }),
      ProductStatus.PUBLISHED,
    );
    await waitFor(() => expect(router.state.location.search).toBe('?status=PUBLISHED'));
    await waitFor(() => expect(seen).toContain('PUBLISHED'));
  });

  it('shows an error with retry when the list cannot load', async () => {
    server.use(
      http.get('*/api/v1/seller/products', () =>
        HttpResponse.json(
          { code: 'UPSTREAM_UNAVAILABLE', message: 'x', status: 502 },
          { status: 502 },
        ),
      ),
    );
    renderApp('/seller/products');
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('validates, creates a product and opens it', async () => {
    let created: unknown;
    server.use(
      http.post('*/api/v1/seller/products', async ({ request }) => {
        created = await request.json();
        return HttpResponse.json(sellerProductFixture(), { status: 201 });
      }),
      http.get('*/api/v1/seller/products/:id', () => HttpResponse.json(sellerProductFixture())),
    );
    const { router } = renderApp('/seller/products/new');

    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(await screen.findAllByText('Too short or too long.')).not.toHaveLength(0);

    await userEvent.type(screen.getByLabelText('Title (English)'), 'Silk lantern');
    await userEvent.type(screen.getByLabelText('Description (English)'), 'Made by hand in Hội An.');
    await userEvent.selectOptions(screen.getByLabelText('Category'), fixtureCategoryId);
    await userEvent.type(screen.getByLabelText('SKU'), 'lan-red');
    await userEvent.type(screen.getByLabelText('Price (USD)'), '15');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/seller/products/b00000000000000000000001'),
    );
    expect(created).toMatchObject({
      categoryId: fixtureCategoryId,
      variants: [{ sku: 'LAN-RED', priceUsdCents: 1500 }],
    });
  });

  it('publishes a draft and uploads an image through a presigned URL', async () => {
    const steps: string[] = [];
    let product = sellerProductFixture();
    server.use(
      http.get('*/api/v1/seller/products/:id', () => HttpResponse.json(product)),
      http.post('*/api/v1/seller/products/:id/publish', () => {
        steps.push('publish');
        product = { ...product, status: ProductStatus.PUBLISHED };
        return HttpResponse.json(product);
      }),
      http.post('*/api/v1/seller/products/:id/images/upload-url', () => {
        steps.push('ticket');
        return HttpResponse.json({
          uploadUrl: 'http://storage.test/bazaar-images/products/p1/a.png?sig=1',
          key: 'products/p1/a.png',
          expiresInSeconds: 300,
          headers: { 'content-type': 'image/png' },
        });
      }),
      http.put('http://storage.test/bazaar-images/products/p1/a.png', () => {
        steps.push('put');
        return new HttpResponse(null, { status: 200 });
      }),
      http.post('*/api/v1/seller/products/:id/images', async ({ request }) => {
        steps.push(`attach ${((await request.json()) as { key: string }).key}`);
        product = {
          ...product,
          images: [
            {
              url: 'http://storage.test/bazaar-images/products/p1/a.png',
              key: 'products/p1/a.png',
              alt: null,
            },
          ],
        };
        return HttpResponse.json(product);
      }),
    );
    renderApp('/seller/products/b00000000000000000000001');

    await userEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    expect(await screen.findByRole('button', { name: 'Unpublish' })).toBeInTheDocument();

    const file = new File(['png'], 'a.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText(/Add an image/), file);

    expect(await screen.findByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(steps).toEqual(['publish', 'ticket', 'put', 'attach products/p1/a.png']);
  });
});
