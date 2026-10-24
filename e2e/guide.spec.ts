import { expect, test } from '@playwright/test';
import {
  createTimelineViaApi,
  login,
  PASSWORD,
  pickColor,
  pickIcon,
  registerViaApi,
  sampleItems,
  uniqueEmail,
} from './helpers';

test.describe('Profile (US-F1.7, US-F1.8)', () => {
  test('rejects weak passwords and duplicate emails, then registers', async ({ page }) => {
    const request = page.request;
    const email = uniqueEmail();
    await page.goto('/register');
    await page.getByLabel('Name').fill('Ann Guide');
    await page.getByLabel('Email').fill(email);

    await page.getByLabel('Password', { exact: true }).fill('weak');
    await page.getByRole('button', { name: 'Create profile' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'at least 8 characters' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);

    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Create profile' }).click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByRole('heading', { name: 'My library' })).toBeVisible();

    // the same email can't be used again
    await page.context().clearCookies();
    await page.goto('/register');
    await page.getByLabel('Name').fill('Other');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Create profile' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'already associated' })).toBeVisible();
    void request;
  });

  test('logs in, shows why wrong credentials fail, and logs out', async ({ page }) => {
    const request = page.request;
    const email = await registerViaApi(request);
    await page.context().clearCookies();

    await login(page, email, 'Wr0ng!Password');
    await expect(page.getByRole('alert')).toContainText('email or the password is incorrect');
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/library$/);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/library');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Creating and editing timelines (US-F1.1 to US-F1.4, US-F1.9, US-F1.10)', () => {
  test.skip(({ isMobile }) => isMobile, 'long editing flow runs on desktop');

  test('create, view in library, edit and delete', async ({ page }) => {
    const request = page.request;
    await registerViaApi(request);

    // Library starts empty with the + box
    await page.goto('/library');
    await expect(page.getByRole('button', { name: 'Create new material' })).toBeVisible();
    await page.getByRole('button', { name: 'Create new material' }).click();
    await page.getByRole('link', { name: 'Timeline', exact: true }).click();
    await expect(page).toHaveURL(/\/timelines\/new$/);

    // Nothing filled in: warned and explained
    await page.getByRole('button', { name: 'Save timeline' }).click();
    const warning = page.getByRole('alert').filter({ hasText: 'cannot be saved yet' });
    await expect(warning).toContainText('Timeline name is required.');
    await expect(warning).toContainText('Description is required.');
    await expect(warning).toContainText('at least one historical event');

    await page.getByLabel('Timeline name').fill('Spanish Golden Age');
    await page.getByLabel('Description').fill('Spain between 1500 and 1650');

    // Only one item form is open at a time; the others are summarised rows.
    await page.getByRole('button', { name: '+ Add event' }).click();
    const event1 = page.getByRole('group', { name: 'Historical event 1' });
    await event1.getByLabel('Year').fill('1556');
    await event1.getByLabel('Event name').fill('Philip II');
    await event1.getByLabel('Event description').fill('Philip II becomes king');
    await pickIcon(event1, 'Crown');

    await page.getByRole('button', { name: '+ Add period' }).click();
    const period = page.getByRole('group', { name: 'Historical period 2' });
    await period.getByLabel('Start year').fill('1500');
    await period.getByLabel('End year').fill('1650');
    await period.getByLabel('Period name').fill('Golden Age');
    await pickColor(period, 'Blue');

    await page.getByRole('button', { name: '+ Add process' }).click();
    const process = page.getByRole('group', { name: 'Historical process 3' });
    await process.getByLabel('Start year').fill('1520');
    await process.getByLabel('End year').fill('1580');
    await process.getByLabel('Process name').fill('Empire');
    await pickColor(process, 'Teal');

    // a second event in the same year asks for the exact date
    await page.getByRole('button', { name: '+ Add event' }).click();
    const event4 = page.getByRole('group', { name: 'Historical event 4' });
    await event4.getByLabel('Year').fill('1556');
    await event4.getByLabel('Event name').fill('Abdication');
    await event4.getByLabel('Event description').fill('Charles V abdicates');
    await pickIcon(event4, 'Scroll');
    await expect(page.getByText('Required: another event shares this year.')).toHaveCount(1);
    await page.getByRole('button', { name: 'Save timeline' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'cannot be saved yet' })).toContainText(
      'exact day and month',
    );

    await event4.getByLabel('Day').fill('16');
    await event4.getByLabel('Month').selectOption('1');
    await page.getByRole('button', { name: /^Event Philip II/ }).click();
    await event1.getByLabel('Day').fill('15');
    await event1.getByLabel('Month').selectOption('1');
    await page.getByRole('button', { name: 'Save timeline' }).click();
    await expect(page).toHaveURL(/\/timelines\/[0-9a-f-]{36}$/);
    await expect(page.getByText('Timeline saved.')).toBeVisible();

    // appears in the library, with a blank cover because none was chosen
    await page
      .getByRole('navigation', { name: 'Breadcrumb' })
      .getByRole('link', { name: 'Library' })
      .click();
    const card = page.getByRole('article', { name: 'Spanish Golden Age' });
    await expect(card).toBeVisible();
    await expect(card.locator('.cover img')).toHaveCount(0);

    // F1.10: add an event, change is visible after saving and reloading
    await card.getByRole('link').click();
    await page.getByRole('button', { name: '+ Add event' }).click();
    const added = page.getByRole('group', { name: 'Historical event 5' });
    await added.getByLabel('Year').fill('1588');
    await added.getByLabel('Event name').fill('Armada');
    await added.getByLabel('Event description').fill('The Armada sails');
    await pickIcon(added, 'Swords');
    await page.getByRole('button', { name: 'Save timeline' }).click();
    await expect(page.getByText('Timeline saved.')).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: /^Event Armada/ }).click();
    await expect(
      page.getByRole('group', { name: 'Historical event 5' }).getByLabel('Event name'),
    ).toHaveValue('Armada');

    // delete the event, save, reload
    await page.getByRole('button', { name: 'Remove Historical event 5' }).click();
    await page.getByRole('button', { name: 'Save timeline' }).click();
    await expect(page.getByText('Timeline saved.')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: /^Event Armada/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Event Abdication/ })).toBeVisible();

    // delete the whole timeline
    await page.getByRole('button', { name: 'Delete timeline' }).click();
    await page.getByRole('button', { name: 'Yes, delete timeline' }).click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByRole('article', { name: 'Spanish Golden Age' })).toHaveCount(0);
  });

  test('the editor is split 2/3 + 1/3, keeps its header fixed and scrolls only the item list', async ({
    page,
  }) => {
    const request = page.request;
    await registerViaApi(request);
    const events = Array.from({ length: 40 }, (_, i) => ({
      kind: 'EVENT',
      year: 1000 + i * 10,
      name: `Event ${i}`,
      description: `Description ${i}`,
    }));
    const tl = await createTimelineViaApi(request, 'Big', [...sampleItems(), ...events]);
    await page.goto(`/timelines/${tl.id}`);
    await expect(page.getByLabel('Timeline name')).toHaveValue('Big');

    // the page itself does not grow: the list scrolls inside its own area
    const fits = await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight + 1,
    );
    expect(fits, 'the page must not scroll').toBe(true);
    const list = page.locator('.item-scroll');
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

    // 2/3 editing zone and 1/3 preview
    const zone = (await page.locator('.editor-zone').boundingBox())!;
    const preview = (await page.locator('.editor-preview').boundingBox())!;
    expect(zone.width / preview.width).toBeGreaterThan(1.8);
    expect(zone.width / preview.width).toBeLessThan(2.2);

    // the fixed header row stays visible while the list scrolls; newest on top, oldest at the bottom
    const rows = page.getByRole('list', { name: 'Historical items' }).getByRole('button');
    await expect(rows.first()).toContainText('Treaty');
    await expect(rows.last()).toContainText('Event 0');
    await list.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(page.getByLabel('Timeline name')).toBeInViewport();
    await expect(page.getByLabel('Description')).toBeInViewport();
    await expect(page.getByLabel('Upload cover image')).toBeAttached();
    await expect(page.locator('.editor-header img')).toHaveCount(0);

    // the phone preview moves with its four buttons
    const screen = page.locator('.phone-screen .tl-scroll');
    const scrollLeft = () => screen.evaluate((el) => el.scrollLeft);
    expect(await screen.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await page.getByRole('button', { name: 'Move timeline right' }).click();
    await expect.poll(scrollLeft).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Move timeline left' }).click();
    await expect.poll(scrollLeft).toBe(0);
    await page.getByRole('button', { name: 'Move timeline down' }).click();
    await expect.poll(() => screen.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Move timeline up' }).click();
    await expect.poll(() => screen.evaluate((el) => el.scrollTop)).toBe(0);
  });

  test('periods and processes are rounded rectangles; processes are striped and use no red or green UI', async ({
    page,
  }) => {
    const request = page.request;
    await registerViaApi(request);
    const tl = await createTimelineViaApi(request, 'Look');
    await page.goto(`/timelines/${tl.id}`);
    const period = page.locator('.phone-screen .tl-bar-period').first();
    const process = page.locator('.phone-screen .tl-bar-process').first();
    await expect(period).toBeVisible();
    const style = (el: ReturnType<typeof page.locator>) =>
      el.evaluate((node) => {
        const s = getComputedStyle(node);
        return { image: s.backgroundImage, radius: parseFloat(s.borderTopLeftRadius) };
      });
    const periodStyle = await style(period);
    const processStyle = await style(process);
    expect(periodStyle.image).toBe('none');
    expect(processStyle.image).toContain('repeating-linear-gradient');
    for (const r of [periodStyle.radius, processStyle.radius]) {
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(8);
    }
    // name only on the bar
    await expect(period).toHaveText('Golden Age');

    // status colors of the interface: neither green nor red
    await page.getByRole('button', { name: 'Save timeline' }).click();
    const status = page.getByRole('status');
    await expect(status).toBeVisible();
    const channels = await status.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.color, s.backgroundColor, s.borderLeftColor].map((c) =>
        (c.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number),
      );
    });
    for (const [r, g, b] of channels as number[][]) {
      expect(b, 'blue is the strongest channel').toBeGreaterThanOrEqual(Math.max(r!, g!));
    }
  });

  test('library cards are large and square on desktop; the editor has breadcrumbs and collapsible data', async ({
    page,
  }) => {
    const request = page.request;
    await registerViaApi(request);
    const tl = await createTimelineViaApi(request, 'Square');
    await page.goto('/library');
    const cards = page.locator('.material-card');
    await expect(cards).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      const box = (await cards.nth(i).boundingBox())!;
      expect(box.width, 'large enough for desktop').toBeGreaterThanOrEqual(240);
      expect(Math.abs(box.width - box.height), 'square').toBeLessThanOrEqual(2);
    }

    await page.goto(`/timelines/${tl.id}`);
    const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(crumbs).toContainText('Library');
    await expect(crumbs.getByText('Square')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: 'Preview' })).toHaveCount(0);

    // the name and description boxes have the same size
    const name = (await page.getByLabel('Timeline name').boundingBox())!;
    const description = (await page.getByLabel('Description').boundingBox())!;
    expect(description.height).toBeCloseTo(name.height, 0);
    expect(description.width).toBeCloseTo(name.width, 0);

    // collapsing the timeline data frees space for the list
    const list = page.locator('.item-scroll');
    const before = (await list.boundingBox())!.height;
    await page.getByRole('button', { name: /Timeline data/ }).click();
    await expect(page.getByLabel('Timeline name')).toHaveCount(0);
    expect((await list.boundingBox())!.height).toBeGreaterThan(before);

    // the event form: icon and image are compact buttons on the same row
    await page.getByRole('button', { name: /^Event Landing/ }).click();
    const form = page.getByRole('group', { name: 'Historical event 1' });
    const row = async (locator: ReturnType<typeof form.locator>) =>
      (await locator.boundingBox())!.y;
    const year = await row(form.getByLabel('Year'));
    expect(
      Math.abs((await row(form.getByRole('button', { name: /Event icon/ })))! - year),
    ).toBeLessThan(30);
    await expect(form.getByLabel('Upload event image')).toBeAttached();
    await expect(form.locator('img')).toHaveCount(0);
  });

  test('library filters by type and other guides cannot edit my timelines', async ({
    page,
    browser,
  }) => {
    const request = page.request;
    await registerViaApi(request);
    const tl = await createTimelineViaApi(request, 'Mine');

    await page.goto('/library');
    await expect(page.getByRole('article', { name: 'Mine' })).toBeVisible();
    await page.getByRole('button', { name: 'Maps' }).click();
    await expect(page.getByRole('article', { name: 'Mine' })).toHaveCount(0);
    await expect(page.getByText(/no maps yet/i)).toBeVisible();
    await page.getByRole('button', { name: 'Timelines' }).click();
    await expect(page.getByRole('article', { name: 'Mine' })).toBeVisible();

    const other = await browser.newContext({ baseURL: 'http://localhost:5173' });
    const otherPage = await other.newPage();
    await registerViaApi(other.request);
    await otherPage.goto(`/timelines/${tl.id}`);
    await expect(otherPage.getByRole('heading', { name: 'Timeline not found' })).toBeVisible();
    await other.close();
  });
});
