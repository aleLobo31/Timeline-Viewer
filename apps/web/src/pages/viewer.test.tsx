import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../test-utils';
import { SharedTimelinePage } from './SharedTimelinePage';

afterEach(() => vi.unstubAllGlobals());

const timeline = {
  name: 'Renaissance',
  description: 'From 1500 to 1600',
  items: [
    {
      kind: 'EVENT',
      id: 'a',
      year: 1500,
      month: null,
      day: null,
      icon: 'SCROLL',
      name: 'Start',
      description: 'd',
      imageUrl: null,
    },
    {
      kind: 'EVENT',
      id: 'b',
      year: 1530,
      month: null,
      day: null,
      icon: 'CROWN',
      name: 'Middle',
      description: 'd',
      imageUrl: null,
    },
    {
      kind: 'EVENT',
      id: 'c',
      year: 1600,
      month: null,
      day: null,
      icon: 'DOVE',
      name: 'End',
      description: 'd',
      imageUrl: null,
    },
  ],
};

const renderViewer = () =>
  renderApp(
    <Routes>
      <Route path="/s/:token" element={<SharedTimelinePage />} />
    </Routes>,
    '/s/abc',
  );

const setup = () =>
  mockFetch({
    'GET /api/auth/me': () => ({
      status: 401,
      body: { error: { code: 'UNAUTHORIZED', message: 'x' } },
    }),
    'GET /api/public/s/abc': () => ({ body: { timeline } }),
  });

/** The year search lives in the hamburger menu: open it first. */
async function openMenu() {
  if (screen.queryByLabelText('From year')) return;
  await userEvent.click(screen.getByRole('button', { name: 'Timeframe menu' }));
}

/** Arrow keys move the window while the timeline has the focus. */
async function press(key: 'ArrowLeft' | 'ArrowRight') {
  screen.getByLabelText(/scroll sideways/).focus();
  await userEvent.keyboard(`{${key}}`);
}

async function applyTimeframe(from: string, to: string) {
  await openMenu();
  const fromInput = screen.getByLabelText('From year');
  const toInput = screen.getByLabelText('To year');
  await userEvent.clear(fromInput);
  await userEvent.type(fromInput, from);
  await userEvent.clear(toInput);
  await userEvent.type(toInput, to);
  await userEvent.click(screen.getByRole('button', { name: 'Show timeframe' }));
}

describe('SharedTimelinePage (US-F1.6)', () => {
  it('shows the whole timeline by default and hides the year search in a menu', async () => {
    setup();
    renderViewer();
    expect(await screen.findByRole('heading', { name: 'Renaissance' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Event:/ })).toHaveLength(3);
    // no earlier / later buttons and no visible range between them
    expect(screen.queryByRole('button', { name: /earlier|later/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('viewer-range')).toHaveClass('sr-only');
    // the year search is behind the hamburger button
    expect(screen.queryByLabelText('From year')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Timeframe menu' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(toggle);
    // a centered modal with both years on the same row (a two column grid)
    const dialog = screen.getByRole('dialog', { name: 'Timeframe' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const fields = dialog.querySelector('.timeframe-fields')!;
    expect(fields.children).toHaveLength(2);
    expect(within(fields as HTMLElement).getByLabelText('From year')).toHaveFocus();
    expect(within(fields as HTMLElement).getByLabelText('To year')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show timeframe' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all' })).toBeInTheDocument();
  });

  it('closes the modal with Escape, the close button and a click outside', async () => {
    setup();
    renderViewer();
    await screen.findByRole('heading', { name: 'Renaissance' });
    await openMenu();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Timeframe menu' })).toHaveFocus();

    await openMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Close timeframe' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await openMenu();
    await userEvent.click(document.querySelector('.modal-backdrop')!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the menu after choosing a timeframe', async () => {
    setup();
    renderViewer();
    await screen.findByRole('heading', { name: 'Renaissance' });
    await applyTimeframe('1520', '1550');
    expect(screen.queryByLabelText('From year')).not.toBeInTheDocument();
  });

  it('cuts the timeline to a valid subset timeframe', async () => {
    setup();
    renderViewer();
    await screen.findByRole('heading', { name: 'Renaissance' });
    await applyTimeframe('1520', '1550');
    expect(screen.getByTestId('viewer-range')).toHaveTextContent('1520 \u2013 1550');
    expect(screen.getAllByRole('button', { name: /Event:/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Event: Middle/ })).toBeInTheDocument();
  });

  it('warns on an invalid timeframe and displays the default timeline', async () => {
    setup();
    renderViewer();
    await screen.findByRole('heading', { name: 'Renaissance' });
    await applyTimeframe('1450', '1550');
    expect(screen.getByRole('alert')).toHaveTextContent(
      /must be inside the timeline, which goes from 1500 to 1600/,
    );
    expect(screen.getByTestId('viewer-range')).toHaveTextContent('1500 \u2013 1600');
    expect(screen.getAllByRole('button', { name: /Event:/ })).toHaveLength(3);

    await applyTimeframe('1550', '1520');
    expect(screen.getByRole('alert')).toHaveTextContent(/start year must be earlier/);
  });

  it('navigates left and right with the arrow keys but not past the edges', async () => {
    setup();
    renderViewer();
    await screen.findByRole('heading', { name: 'Renaissance' });
    await applyTimeframe('1500', '1540');
    const range = screen.getByTestId('viewer-range');

    await press('ArrowLeft'); // at the beginning
    expect(range).toHaveTextContent('1500 – 1540');

    await press('ArrowRight');
    expect(range).toHaveTextContent('1520 – 1560');
    for (let i = 0; i < 3; i++) await press('ArrowRight');
    expect(range).toHaveTextContent('1560 – 1600');
    await press('ArrowRight'); // at the end
    expect(range).toHaveTextContent('1560 – 1600');

    await press('ArrowLeft');
    expect(range).toHaveTextContent('1540 – 1580');
  });

  it('explains when the timeline is not shared (or no longer shared)', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({
        status: 401,
        body: { error: { code: 'UNAUTHORIZED', message: 'x' } },
      }),
      'GET /api/public/s/abc': () => ({
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'nope' } },
      }),
    });
    renderViewer();
    expect(await screen.findByText(/stopped sharing it/)).toBeInTheDocument();
  });
});
