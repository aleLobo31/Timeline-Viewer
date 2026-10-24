import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../test-utils';
import { LibraryPage } from '../pages/LibraryPage';

afterEach(() => vi.unstubAllGlobals());

const materials = [
  {
    id: 'a',
    type: 'TIMELINE',
    name: 'Rome',
    description: '',
    coverImage: null,
    shared: false,
    updatedAt: '',
  },
  {
    id: 'b',
    type: 'TIMELINE',
    name: 'Greece',
    description: '',
    coverImage: null,
    shared: false,
    updatedAt: '',
  },
];
const base = {
  'GET /api/auth/me': () => ({ body: { user: { id: 'u', email: 'a@b.c', name: 'Ann' } } }),
  'GET /api/materials': () => ({ body: { materials } }),
};

describe('Sharing from the library (US-F1.5)', () => {
  it('requires selecting at least one timeline', async () => {
    mockFetch(base);
    renderApp(<LibraryPage />);
    await screen.findByRole('article', { name: 'Rome' });
    expect(screen.getByRole('button', { name: /Share selected/ })).toBeDisabled();
  });

  it('shares the selected timelines through a link', async () => {
    const calls = mockFetch({
      ...base,
      'POST /api/shares': () => ({
        body: {
          shares: [
            { materialId: 'a', share: { token: 'tokA', method: 'LINK', path: '/s/tokA' } },
            { materialId: 'b', share: { token: 'tokB', method: 'LINK', path: '/s/tokB' } },
          ],
        },
      }),
    });
    renderApp(<LibraryPage />);
    await userEvent.click(await screen.findByLabelText('Select Rome'));
    await userEvent.click(screen.getByLabelText('Select Greece'));
    await userEvent.click(screen.getByRole('button', { name: /Share selected \(2\)/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));

    const inputs = await screen.findAllByLabelText('Share link');
    expect(inputs.map((i) => (i as HTMLInputElement).value)).toEqual([
      `${window.location.origin}/s/tokA`,
      `${window.location.origin}/s/tokB`,
    ]);
    expect(calls.find((c) => c.url === '/api/shares')?.body).toEqual({
      materialIds: ['a', 'b'],
      method: 'LINK',
    });
  });

  it('shares through a QR code that points at the same url', async () => {
    mockFetch({
      ...base,
      'POST /api/shares': () => ({
        body: {
          shares: [{ materialId: 'a', share: { token: 'tokA', method: 'QR', path: '/s/tokA' } }],
        },
      }),
    });
    renderApp(<LibraryPage />);
    await userEvent.click(await screen.findByLabelText('Select Rome'));
    await userEvent.click(screen.getByRole('button', { name: /Share selected/ }));
    await userEvent.click(screen.getByLabelText('QR code'));
    await userEvent.click(screen.getByRole('button', { name: 'Share' }));
    const qr = await screen.findByRole(
      'img',
      { name: /QR code that opens Rome/ },
      { timeout: 4000 },
    );
    expect(qr.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(screen.getByRole('link', { name: 'Download QR' })).toBeInTheDocument();
  });
});
