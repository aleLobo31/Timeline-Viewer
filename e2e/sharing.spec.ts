import { expect, test } from '@playwright/test';
import { createTimelineViaApi, registerViaApi, shareViaApi } from './helpers';

test.describe('Sharing (US-F1.5)', () => {
  for (const method of ['Link', 'QR code'] as const) {
    test(`tourist sees a timeline shared through ${method}`, async ({ page, browser }) => {
      const request = page.request;
      await registerViaApi(request);
      const sharedOne = await createTimelineViaApi(request, 'Shared one');
      await createTimelineViaApi(request, 'Private one');

      await page.goto('/library');
      await expect(page.getByRole('checkbox')).toHaveCount(0);
      await page.getByRole('button', { name: 'Share Shared one' }).click();
      const dialog = page.getByRole('dialog', { name: 'Share Shared one' });
      await dialog.getByText(method, { exact: true }).click();
      await dialog.getByRole('button', { name: 'Share', exact: true }).click();

      let url: string;
      if (method === 'Link') {
        url = await page.getByLabel('Share link').inputValue();
      } else {
        await expect(
          page.getByRole('img', { name: /QR code that opens Shared one/ }),
        ).toBeVisible();
        // only the QR is shown: no direct link, and both buttons sit on one centered row
        await expect(dialog.getByLabel('Share link')).toHaveCount(0);
        await expect(dialog.getByText(/\/s\//)).toHaveCount(0);
        const download = (await dialog.getByRole('link', { name: 'Download QR' }).boundingBox())!;
        const stop = (await dialog.getByRole('button', { name: 'Stop sharing' }).boundingBox())!;
        expect(Math.abs(download.y - stop.y)).toBeLessThan(4);
        const qr = (await page.getByRole('img', { name: /QR code that opens/ }).boundingBox())!;
        const box = (await dialog.boundingBox())!;
        expect(Math.abs(qr.x + qr.width / 2 - (box.x + box.width / 2))).toBeLessThan(4);
        // the url the QR encodes comes from the API
        const detail = await request.get(`/api/timelines/${sharedOne.id}`);
        url = `${new URL(page.url()).origin}${(await detail.json()).timeline.share.path}`;
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
    await page.getByRole('button', { name: 'Share Soon private' }).click();
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
    // no earlier / later buttons: the year search is behind the hamburger menu, top right
    await expect(page.getByRole('button', { name: /earlier|later/i })).toHaveCount(0);
    await expect(page.getByLabel('From year')).toHaveCount(0);
    const menu = page.getByRole('button', { name: 'Timeframe menu' });
    const menuBox = (await menu.boundingBox())!;
    const pageBox = (await page.locator('main').boundingBox())!;
    expect(menuBox.x + menuBox.width, 'right side').toBeGreaterThan(pageBox.x + pageBox.width - 40);
    expect(menuBox.y, 'top').toBeLessThan(120);

    // expand an event
    await page.getByRole('button', { name: /Event: Coronation/ }).click();
    await expect(page.getByTestId('timeline-details')).toContainText('A king is crowned');

    // invalid subset: warns, whole timeline displayed
    await menu.click();
    await page.getByLabel('From year').fill('1450');
    await page.getByLabel('To year').fill('1550');
    await page.getByRole('button', { name: 'Show timeframe' }).click();
    await expect(page.getByRole('alert')).toContainText('must be inside the timeline');
    await expect(page.getByTestId('viewer-range')).toHaveText('1480 \u2013 1580');

    // valid subset
    await menu.click();
    await page.getByLabel('From year').fill('1500');
    await page.getByLabel('To year').fill('1530');
    await page.getByRole('button', { name: 'Show timeframe' }).click();
    await expect(page.getByTestId('viewer-range')).toHaveText('1500 \u2013 1530');
    await expect(page.getByRole('button', { name: /Event:/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Event: Coronation/ })).toBeVisible();

    // navigation: both directions, blocked at the edges
    // (arrow keys, while the timeline has the focus)
    const range = page.getByTestId('viewer-range');
    await page.getByLabel(/scroll sideways/).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(range).toHaveText('1485 \u2013 1515');
    await page.keyboard.press('ArrowLeft');
    await expect(range).toHaveText('1480 \u2013 1510');
    await page.keyboard.press('ArrowLeft'); // blocked at the beginning
    await expect(range).toHaveText('1480 \u2013 1510');
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
    await expect(range).toHaveText('1550 \u2013 1580'); // blocked at the end
    await tourist.close();
  });
});
