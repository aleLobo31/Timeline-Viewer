import { screen, within } from '@testing-library/react';
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
  it('has no bulk selection: every card has its own share icon', async () => {
    mockFetch(base);
    renderApp(<LibraryPage />);
    await screen.findByRole('article', { name: 'Rome' });
    expect(screen.queryByRole('button', { name: /Share selected/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    for (const name of ['Rome', 'Greece']) {
      const card = screen.getByRole('article', { name });
      expect(within(card).getByRole('button', { name: `Share ${name}` })).toBeInTheDocument();
    }
  });

  it('asks for link or QR in a modal and shares only that timeline through a link', async () => {
    const calls = mockFetch({
      ...base,
      'POST /api/shares': () => ({
        body: {
          shares: [{ materialId: 'b', share: { token: 'tokB', method: 'LINK', path: '/s/tokB' } }],
        },
      }),
    });
    renderApp(<LibraryPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Share Greece' }));

    const dialog = screen.getByRole('dialog', { name: 'Share Greece' });
    expect(within(dialog).getByLabelText('Link')).toBeChecked();
    expect(within(dialog).getByLabelText('QR code')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Share' }));

    const input = await screen.findByLabelText('Share link');
    expect((input as HTMLInputElement).value).toBe(`${window.location.origin}/s/tokB`);
    expect(calls.find((c) => c.url === '/api/shares')?.body).toEqual({
      materialIds: ['b'],
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
    await userEvent.click(await screen.findByRole('button', { name: 'Share Rome' }));
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

  it('closes the modal with Escape and with the close button', async () => {
    mockFetch(base);
    renderApp(<LibraryPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Share Rome' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Share Rome' }));
    await userEvent.click(screen.getByRole('button', { name: 'Close sharing' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
