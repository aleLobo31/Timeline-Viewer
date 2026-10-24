import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createTimelineViaApi, registerViaApi, shareViaApi } from './helpers';

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page must not scroll sideways').toBeLessThanOrEqual(1);
}

/** Q-1: touch targets of interactive controls are at least 44px tall. */
async function tapTargetsAreBigEnough(page: Page, scope = 'main') {
  const small = await page.evaluate((sel) => {
    const root = document.querySelector(sel) ?? document.body;
    const controls = root.querySelectorAll<HTMLElement>(
      'button, a[href], select, input[type=text], input[type=email], input[type=password], input[type=number]',
    );
    const bad: string[] = [];
    controls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || style.visibility === 'hidden') return; // hidden / sr-only
      // inline links inside paragraphs are exempt
      if (el.tagName === 'A' && el.closest('p') && !el.classList.contains('btn')) return;
      if (r.height < 43.5)
        bad.push(
          `${el.tagName} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.height)}px`,
        );
    });
    return bad;
  }, scope);
  expect(small, 'controls smaller than 44px').toEqual([]);
}

/** Q-1: text is readable on a phone (>= 16px for content, never below 14px). */
async function textIsReadable(page: Page) {
  const tiny = await page.evaluate(() => {
    const bad: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? '').trim();
      const el = n.parentElement;
      if (!text || !el || ['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 14) bad.push(`"${text.slice(0, 25)}" ${size}px`);
    }
    return bad;
  });
  expect(tiny, 'text smaller than 14px').toEqual([]);
  const content = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '.tl-event-name, .tl-event-year, .tl-bar-name, .tl-details-text, main p',
      ),
    )
      .filter((el) => el.getBoundingClientRect().width > 2)
      .map((el) => parseFloat(getComputedStyle(el).fontSize)),
  );
  expect(content.length).toBeGreaterThan(0);
  for (const size of content) expect(size).toBeGreaterThanOrEqual(16);
}

async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    serious.map(
      (v) =>
        `${v.id}: ${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 3)
          .join(' | ')}`,
    ),
  ).toEqual([]);
}

test.describe('Q-1 responsive and readable', () => {
  test('tourist viewer works on the current viewport', async ({ request, browser, baseURL }) => {
    await registerViaApi(request);
    const tl = await createTimelineViaApi(request, 'Responsive');
    const share = await shareViaApi(request, tl.id);
    const ctx = await browser.newContext({ ...test.info().project.use, baseURL });
    const page = await ctx.newPage();
    await page.goto(share.path);
    await expect(page.getByRole('heading', { name: 'Responsive' })).toBeVisible();
    await page.getByRole('button', { name: /Event: Landing/ }).click();
    await expect(page.getByTestId('timeline-details')).toBeVisible();

    await noHorizontalOverflow(page);
    await tapTargetsAreBigEnough(page);
    await textIsReadable(page);
    await expectNoSeriousA11yIssues(page);

    // the timeline itself is reachable by scrolling inside its own container
    const scrollable = await page
      .locator('.tl-scroll')
      .evaluate((el) => el.scrollWidth >= el.clientWidth);
    expect(scrollable).toBe(true);
    await ctx.close();
  });

  test('guide pages fit the viewport', async ({ page }) => {
    const request = page.request;
    await registerViaApi(request);
    const tl = await createTimelineViaApi(request, 'Mine');

    // Q-4: the editor is desktop-first, so phones only check the library.
    const isMobile = test.info().project.name === 'mobile';
    const urls = isMobile ? ['/library'] : ['/library', `/timelines/${tl.id}`, '/timelines/new'];
    for (const url of urls) {
      await page.goto(url);
      await expect(page.locator('main h1')).toBeVisible();
      await noHorizontalOverflow(page);
      await tapTargetsAreBigEnough(page);
    }
    await page.goto('/library');
    await expectNoSeriousA11yIssues(page);
    if (isMobile) return;
    await page.goto(`/timelines/${tl.id}`);
    await expect(page.getByLabel('Timeline name')).toBeVisible();
    await expectNoSeriousA11yIssues(page);
    await page.getByRole('button', { name: /^Event Landing/ }).click();
    await expectNoSeriousA11yIssues(page);
  });

  test('auth pages are accessible and fit the viewport', async ({ page }) => {
    for (const url of ['/login', '/register']) {
      await page.goto(url);
      await expect(page.locator('main h1')).toBeVisible();
      await noHorizontalOverflow(page);
      await tapTargetsAreBigEnough(page);
      await expectNoSeriousA11yIssues(page);
    }
  });
});

test.describe('Q-2 sensitive data', () => {
  test('the session cookie is not readable by scripts and passwords are never returned', async ({
    page,
  }) => {
    const request = page.request;
    await registerViaApi(request);
    await page.goto('/library');
    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name === 'tv_session');
    expect(session?.httpOnly).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain('tv_session');
    const me = await request.get('/api/auth/me');
    expect(JSON.stringify(await me.json())).not.toMatch(/password|hash/i);
  });
});

test.describe('Q-3 interactions answer in under 1 second', () => {
  /** Time (ms) until the DOM reflects an action, measured inside the page after two animation frames. */
  async function timed(page: Page, action: string): Promise<number> {
    return page.evaluate(async (code) => {
      const t0 = performance.now();
      new Function(code)();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return performance.now() - t0;
    }, action);
  }

  test('a large timeline (300 items) can be opened, expanded and panned quickly', async ({
    request,
    browser,
    baseURL,
  }) => {
    await registerViaApi(request);
    const items: unknown[] = [];
    for (let i = 0; i < 150; i++) {
      items.push({
        kind: 'EVENT',
        year: 1000 + i * 4,
        icon: 'SCROLL',
        name: `Event ${i}`,
        description: `Description ${i}`,
      });
    }
    for (let i = 0; i < 75; i++) {
      items.push({
        kind: 'PROCESS',
        startYear: 1000 + i * 8,
        endYear: 1000 + i * 8 + 40,
        name: `Process ${i}`,
        color: 'teal',
      });
      items.push({
        kind: 'PERIOD',
        startYear: 1000 + i * 8,
        endYear: 1000 + i * 8 + 60,
        name: `Period ${i}`,
        color: 'violet',
      });
    }
    const tl = await createTimelineViaApi(request, 'Huge', items);
    const share = await shareViaApi(request, tl.id);

    const ctx = await browser.newContext({ ...test.info().project.use, baseURL });
    const page = await ctx.newPage();
    const start = Date.now();
    await page.goto(share.path);
    await expect(page.getByRole('heading', { name: 'Huge' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Event: Event 0/ })).toBeVisible();
    expect(Date.now() - start, 'initial load').toBeLessThan(3000);

    const select = await timed(page, `document.querySelector('.tl-event').click()`);
    expect(select, 'select event').toBeLessThan(1000);
    await expect(page.getByTestId('timeline-details')).toBeVisible();

    const apply = await (async () => {
      await page.getByLabel('From year').fill('1100');
      await page.getByLabel('To year').fill('1300');
      return timed(
        page,
        `document.querySelector('form[aria-label="Choose a timeframe"] button[type=submit]').click()`,
      );
    })();
    expect(apply, 'apply timeframe').toBeLessThan(1000);
    await expect(page.getByTestId('viewer-range')).toHaveText('1100 \u2013 1300');

    for (let i = 0; i < 3; i++) {
      const pan = await timed(
        page,
        `document.querySelector('button[aria-label="Move to later years"]').click()`,
      );
      expect(pan, 'pan').toBeLessThan(1000);
    }
    await ctx.close();
  });

  test('the editor reacts to typing quickly', async ({ page }) => {
    const request = page.request;
    await registerViaApi(request);
    const items = Array.from({ length: 60 }, (_, i) => ({
      kind: 'EVENT',
      year: 1000 + i,
      icon: 'SCROLL',
      name: `E${i}`,
      description: 'd',
    }));
    const tl = await createTimelineViaApi(request, 'Edit me', items);
    await page.goto(`/timelines/${tl.id}`);
    const field = page.getByLabel('Timeline name');
    await expect(field).toHaveValue('Edit me');
    const t0 = Date.now();
    await field.fill('Edit me again and again');
    await expect(page.getByLabel('Timeline name')).toHaveValue('Edit me again and again');
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
