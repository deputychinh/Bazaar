import { expect, test } from '@playwright/test';

import { api, PASSWORD, signIn, tokenFor, verificationToken } from './support';

const ADMIN = 'admin@bazaar.test';
const SELLER = 'seller.minh@bazaar.test';
/** Seeded leaf category "Cookware". */
const CATEGORY_ID = 'ca0000000000000000000002';

test('an admin approves a new seller application', async ({ page }) => {
  // A new person registers, confirms the emailed link and applies to sell.
  const id = Date.now().toString(36);
  const email = `e2e-seller-${id}@bazaar.test`;
  const shopName = `E2E Crafts ${id}`;
  await api('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: PASSWORD, preferredLocale: 'en' }),
  });
  await api('/api/v1/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token: await verificationToken(email) }),
  });
  await api('/api/v1/seller-applications', {
    method: 'POST',
    token: await tokenFor(email),
    body: JSON.stringify({ shopName }),
  });

  await signIn(page, ADMIN);
  await expect(page.getByRole('heading', { name: 'Marketplace' })).toBeVisible();
  await page.getByRole('link', { name: 'Sellers' }).click();
  const application = page.getByRole('listitem').filter({ hasText: shopName });
  await application.getByRole('button', { name: 'Approve' }).click();
  await expect(application).toBeHidden();

  await page.getByLabel('Status').selectOption('APPROVED');
  await expect(page.getByRole('listitem').filter({ hasText: shopName })).toBeVisible();
});

test('an admin hides a product with a reason, then restores it', async ({ page }) => {
  // Restoring sends a product back to DRAFT, so moderate one made for this run, never seed data.
  const sku = `MOD-${Date.now().toString(36).toUpperCase()}`;
  const title = `Moderation lamp ${sku}`;
  const sellerToken = await tokenFor(SELLER);
  const created = await api<{ id: string }>('/api/v1/seller/products', {
    method: 'POST',
    token: sellerToken,
    body: JSON.stringify({
      title: { en: title },
      description: { en: 'A lamp created by the moderation journey test.' },
      categoryId: CATEGORY_ID,
      variants: [{ sku, priceUsdCents: 1_900, stock: 3 }],
    }),
  });
  await api(`/api/v1/seller/products/${created.id}/publish`, {
    method: 'POST',
    token: sellerToken,
  });

  await signIn(page, ADMIN);
  await page.getByRole('link', { name: 'Moderation' }).click();
  await page.getByLabel('Status').selectOption('PUBLISHED');
  await page.getByLabel('Title contains').fill(sku);
  await page.getByRole('button', { name: 'Apply' }).click();

  const card = page.getByRole('listitem').filter({ hasText: title });
  await card.getByRole('button', { name: 'Hide' }).click();
  await card.getByLabel('Reason').fill('Journey test: checking moderation');
  await card.getByRole('button', { name: 'Hide' }).click();

  await page.getByLabel('Status').selectOption('HIDDEN');
  await expect(card.getByText('Hidden: Journey test: checking moderation')).toBeVisible();
  await card.getByRole('button', { name: 'Restore' }).click();
  await expect(card).toHaveCount(0);

  const restored = await api<{ status: string }>(`/api/v1/seller/products/${created.id}`, {
    token: sellerToken,
  });
  expect(restored.status).toBe('DRAFT');
});
