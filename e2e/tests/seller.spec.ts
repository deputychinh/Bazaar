import { expect, test } from '@playwright/test';

import { api, signIn, tokenFor } from './support';

const SELLER = 'seller.minh@bazaar.test';
const SHOPPER = 'shopper.linh@bazaar.test';

test('a seller creates and publishes a product, then ships its first order', async ({ page }) => {
  const sku = `E2E-${Date.now().toString(36).toUpperCase()}`;
  const title = `Journey vase ${sku}`;

  await signIn(page, SELLER);
  await expect(page.getByRole('heading', { name: 'Your shop' })).toBeVisible();

  // Create the product.
  await page.getByRole('link', { name: 'Products' }).click();
  await page.getByRole('link', { name: 'New product' }).click();
  await page.getByLabel('Title (English)').fill(title);
  await page.getByLabel('Description (English)').fill('A vase created by the seller journey test.');
  await page.getByLabel('Category').selectOption({ index: 1 });
  await page.getByLabel('SKU').fill(sku);
  await page.getByLabel('Price (USD)').fill('24.50');
  await page.getByLabel('Stock').fill('5');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/seller\/products\/[0-9a-f]{24}$/);

  // Publish it.
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
  const productId = page.url().split('/').at(-1) ?? '';

  // A shopper buys it (outside the admin site).
  const sellerToken = await tokenFor(SELLER);
  const product = await api<{ slug: string }>(`/api/v1/seller/products/${productId}`, {
    token: sellerToken,
  });
  const order = await api<{ id: string }>('/api/v1/orders', {
    method: 'POST',
    token: await tokenFor(SHOPPER),
    headers: { 'idempotency-key': `e2e-${sku}` },
    body: JSON.stringify({
      lines: [{ productSlug: product.slug, variantSku: sku, quantity: 1 }],
      card: { number: '4242424242424242' },
    }),
  });
  const reference = `#${order.id.slice(-8).toUpperCase()}`;

  // The seller ships it once the saga has confirmed it.
  await page.getByRole('link', { name: 'Orders' }).click();
  await expect(page).toHaveURL(/\/seller\/orders/);
  const card = page.getByRole('listitem').filter({ hasText: reference });
  await expect(async () => {
    await page.reload();
    await expect(card).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await card.getByRole('button', { name: 'Mark as shipped' }).click();
  await expect(card).toBeHidden();

  await page.getByRole('button', { name: 'Shipped', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: reference })).toBeVisible();
});
