import { expect, test } from '@playwright/test';
import { createTimelineViaApi, registerViaApi, shareViaApi } from './helpers';

test.describe('Sharing (US-F1.5)', () => {
  for (const method of ['Link', 'QR code'] as const) {
    test(`tourist sees a timeline shared through ${method}`, async ({ page, browser }) => {
      const request = page.request;
      await registerViaApi(request);
      await createTimelineViaApi(request, 'Shared one');
      await createTimelineViaApi(request, 'Private one');

      await page.goto('/library');
      await expect(page.getByRole('button', { name: /Share selected/ })).toBeDisabled();
      await page.getByLabel('Select Shared one').check();
      await page.getByRole('button', { name: /Share selected/ }).click();
      await page.getByText(method, { exact: true }).click();
      await page.getByRole('button', { name: 'Share', exact: true }).click();

      let url: string;
      if (method === 'Link') {
        url = await page.getByLabel('Share link').inputValue();
      } else {
        await expect(
          page.getByRole('img', { name: /QR code that opens Shared one/ }),
        ).toBeVisible();
        url = (await page.locator('.qr-share .hint').innerText()).trim();
      }
      expect(url).toMatch(/\/s\/[A-Za-z0-9_-]{22}$/);

      // A tourist: a brand new browser context, no session at all
      const tourist = await browser.newContext({ baseURL: 'http://localhost:5173' });
      const tp = await tourist.newPage();
      await tp.goto(url);
      await expect(tp.getByRole('heading', { name: 'Shared one' })).toBeVisible();
      await expect(tp.getByRole('button', { name: /Event: Landing/ })).toBeVisible();
      // read-only: no editing controls
      await expect(tp.getByRole('button', { name: 'Save timeline' })).toHaveCount(0);
      await tourist.close();

      // the not shared timeline is not visible for tourists
      const privateId = await request
        .get('/api/materials')
        .then(
          async (r) =>
            (await r.json()).materials.find((m: { name: string }) => m.name === 'Private one').id,
        );
      const t2 = await browser.newContext({ baseURL: 'http://localhost:5173' });
      const p2 = await t2.newPage();
      await p2.goto(`/s/${privateId}`);
      await expect(p2.getByRole('heading', { name: 'Timeline not available' })).toBeVisible();
      await p2.goto(`/timelines/${privateId}`);
      await expect(p2).toHaveURL(/\/login$/);
      await t2.close();
    });
  }

  test('stop sharing makes the timeline unavailable', async ({ page, browser }) => {
    const request = page.request;
    await registerViaApi(request);
    const tl = await createTimelineViaApi(request, 'Soon private');
    const share = await shareViaApi(request, tl.id);

    const tourist = await browser.newContext({ baseURL: 'http://localhost:5173' });
    const tp = await tourist.newPage();
    await tp.goto(share.path);
    await expect(tp.getByRole('heading', { name: 'Soon private' })).toBeVisible();

    await page.goto('/library');
    await expect(
      page.getByRole('article', { name: 'Soon private' }).getByText('Shared', { exact: true }),
    ).toBeVisible();
    await page.getByLabel('Select Soon private').check();
    await page.getByRole('button', { name: /Share selected/ }).click();
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await page.getByRole('button', { name: 'Stop sharing' }).click();
    await expect(page.getByText(/Sharing stopped/)).toBeVisible();

    await tp.reload();
    await expect(tp.getByRole('heading', { name: 'Timeline not available' })).toBeVisible();
    await tourist.close();
  });
});

test.describe('Tourist viewer (US-F1.6)', () => {
  test('timeframe cut, invalid timeframe warning and edge-aware navigation', async ({
    request,
    browser,
  }) => {
    await registerViaApi(request);
    const tl = await createTimelineViaApi(request, 'Viewer');
    const share = await shareViaApi(request, tl.id);

    const tourist = await browser.newContext({ baseURL: 'http://localhost:5173' });
    const page = await tourist.newPage();
    await page.goto(share.path);
    // full range of the sample is 1480 - 1580
    await expect(page.getByTestId('viewer-range')).toHaveText('1480 \u2013 1580');
    await expect(page.getByRole('button', { name: /Event:/ })).toHaveCount(3);

    // expand an event
    await page.getByRole('button', { name: /Event: Coronation/ }).click();
    await expect(page.getByTestId('timeline-details')).toContainText('A king is crowned');

    // invalid subset: warns, whole timeline displayed
    await page.getByLabel('From year').fill('1450');
    await page.getByLabel('To year').fill('1550');
    await page.getByRole('button', { name: 'Show timeframe' }).click();
    await expect(page.getByRole('alert')).toContainText('must be inside the timeline');
    await expect(page.getByTestId('viewer-range')).toHaveText('1480 \u2013 1580');

    // valid subset
    await page.getByLabel('From year').fill('1500');
    await page.getByLabel('To year').fill('1530');
    await page.getByRole('button', { name: 'Show timeframe' }).click();
    await expect(page.getByTestId('viewer-range')).toHaveText('1500 \u2013 1530');
    await expect(page.getByRole('button', { name: /Event:/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Event: Coronation/ })).toBeVisible();

    // navigation: both directions, blocked at the edges
    const left = page.getByRole('button', { name: 'Move to earlier years' });
    const right = page.getByRole('button', { name: 'Move to later years' });
    await expect(left).toBeEnabled();
    await expect(right).toBeEnabled();
    await left.click();
    await expect(page.getByTestId('viewer-range')).toHaveText('1485 \u2013 1515');
    await left.click();
    await expect(page.getByTestId('viewer-range')).toHaveText('1480 \u2013 1510');
    await expect(left).toBeDisabled();
    for (let i = 0; i < 6; i++) if (await right.isEnabled()) await right.click();
    await expect(page.getByTestId('viewer-range')).toHaveText('1550 \u2013 1580');
    await expect(right).toBeDisabled();
    await tourist.close();
  });
});
