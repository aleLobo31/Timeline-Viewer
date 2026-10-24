import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';

export const PASSWORD = 'Str0ng!Passw0rd';

export const uniqueEmail = () =>
  `guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

/** Registers through the API; the session cookie lands in the browser context. */
export async function registerViaApi(request: APIRequestContext, email = uniqueEmail()) {
  const res = await request.post('/api/auth/register', {
    data: { email, name: 'Test Guide', password: PASSWORD },
  });
  expect(res.status()).toBe(201);
  return email;
}

export const sampleItems = () => [
  {
    kind: 'EVENT',
    year: 1492,
    month: 10,
    day: 12,
    icon: 'SWORDS',
    name: 'Landing',
    description: 'Ships land',
  },
  {
    kind: 'EVENT',
    year: 1520,
    icon: 'CROWN',
    name: 'Coronation',
    description: 'A king is crowned',
  },
  { kind: 'EVENT', year: 1580, icon: 'SCROLL', name: 'Treaty', description: 'Peace is signed' },
  {
    kind: 'PERIOD',
    startYear: 1480,
    endYear: 1560,
    name: 'Golden Age',
    color: 'blue',
    description: 'Prosperity',
  },
  { kind: 'PROCESS', startYear: 1500, endYear: 1540, name: 'Colonisation', color: 'green' },
  { kind: 'PROCESS', startYear: 1500, endYear: 1540, name: 'Trade', color: 'orange' },
];

export async function createTimelineViaApi(
  request: APIRequestContext,
  name = 'Renaissance',
  items: unknown[] = sampleItems(),
) {
  const res = await request.post('/api/timelines', {
    data: { name, description: `About ${name}`, items },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).timeline as { id: string };
}

export async function shareViaApi(
  request: APIRequestContext,
  id: string,
  method: 'LINK' | 'QR' = 'LINK',
) {
  const res = await request.post('/api/shares', { data: { materialIds: [id], method } });
  expect(res.status()).toBe(200);
  return (await res.json()).shares[0].share as { token: string; path: string };
}

/** Opens the collapsible icon picker of an event form and chooses an icon (glyph-only options). */
export async function pickIcon(form: Locator, label: string) {
  await form.getByRole('button', { name: /Event icon/ }).click();
  await form.locator(`label[title="${label}"]`).click();
}

/** Opens the collapsible color picker of a process / period form and chooses a color. */
export async function pickColor(form: Locator, label: string) {
  await form.getByRole('button', { name: /Color/ }).click();
  await form.locator(`label[title="${label}"]`).click();
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}
