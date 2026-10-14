import { expect, test } from '@playwright/test';

import { signIn } from '../tests/support';

const WEB = process.env.WEB_URL ?? 'http://bazaar.localhost';
const GRAFANA = process.env.GRAFANA_URL ?? 'http://grafana.bazaar.localhost';
const OUT = '../docs/screenshots';

const shot = (name: string): { path: string } => ({ path: `${OUT}/${name}.png` });

test('customer site', async ({ page }) => {
  await page.goto(`${WEB}/en`);
  await page.screenshot(shot('web-home-en'));

  await page.goto(`${WEB}/vi/c/home-kitchen`);
  await expect(page.locator('main')).toBeVisible();
  await page.screenshot(shot('web-category-vi'));

  // A seeded product (journey tests leave products without images behind).
  const product = page
    .locator('main a[href*="/p/"]')
    .filter({ hasNotText: /Journey|Moderation|Last items|Upload|Admin|R3-/ })
    .first();
  await product.click();
  await expect(page).toHaveURL(/\/p\//);
  await page.screenshot(shot('web-product-vi'));
});

test('admin site', async ({ page }) => {
  await signIn(page, 'seller.minh@bazaar.test');
  await expect(page.getByRole('heading', { name: 'Your shop' })).toBeVisible();
  await page.screenshot(shot('admin-seller-dashboard'));
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Orders' })
    .click();
  await expect(page).toHaveURL(/\/seller\/orders/);
  await page.screenshot(shot('admin-seller-orders'));
  await page.getByRole('button', { name: 'Sign out' }).click();

  await signIn(page, 'admin@bazaar.test');
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Moderation' })
    .click();
  await expect(page.getByRole('listitem').first()).toBeVisible();
  await page.screenshot(shot('admin-platform-moderation'));
});

test('observability', async ({ browser }) => {
  const context = await browser.newContext({
    httpCredentials: { username: 'admin', password: 'bazaar-local' },
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(`${GRAFANA}/login`);
  await page.getByPlaceholder('email or username').fill('admin');
  await page.getByPlaceholder('password').fill('bazaar-local');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  await page.goto(`${GRAFANA}/d/bazaar-services?orgId=1&from=now-30m&to=now&kiosk`);
  await page.waitForLoadState('networkidle');
  await page.screenshot(shot('grafana-services'));

  // The latest checkout as one trace across the services.
  const now = Math.floor(Date.now() / 1000);
  const search = await page.request.get(
    `${GRAFANA}/api/datasources/proxy/uid/tempo/api/search?q=${encodeURIComponent('{name="saga.settle-payment"}')}&limit=1&start=${now - 3600}&end=${now}`,
    // Grafana sends no Basic challenge, so the credentials are not offered unasked.
    { headers: { authorization: `Basic ${Buffer.from('admin:bazaar-local').toString('base64')}` } },
  );
  const traceId = ((await search.json()) as { traces: { traceID: string }[] }).traces[0]?.traceID;
  expect(traceId).toBeTruthy();
  const panes = encodeURIComponent(
    JSON.stringify({
      a: {
        datasource: 'tempo',
        queries: [
          {
            refId: 'A',
            datasource: { type: 'tempo', uid: 'tempo' },
            queryType: 'traceql',
            query: traceId,
          },
        ],
        range: { from: 'now-1h', to: 'now' },
      },
    }),
  );
  await page.goto(`${GRAFANA}/explore?schemaVersion=1&orgId=1&panes=${panes}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3_000);
  await page.screenshot(shot('grafana-trace'));
  await context.close();
});
