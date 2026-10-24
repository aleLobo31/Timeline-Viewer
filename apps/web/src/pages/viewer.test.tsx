import { screen } from '@testing-library/react';
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

async function applyTimeframe(from: string, to: string) {
  const fromInput = screen.getByLabelText('From year');
  const toInput = screen.getByLabelText('To year');
  await userEvent.clear(fromInput);
  await userEvent.type(fromInput, from);
  await userEvent.clear(toInput);
  await userEvent.type(toInput, to);
  await userEvent.click(screen.getByRole('button', { name: 'Show timeframe' }));
}

describe('SharedTimelinePage (US-F1.6)', () => {
  it('shows the whole timeline by default, with navigation disabled', async () => {
    setup();
    renderViewer();
    expect(await screen.findByRole('heading', { name: 'Renaissance' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Event:/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Move to earlier years' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move to later years' })).toBeDisabled();
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

  it('navigates left and right but not past the edges', async () => {
    setup();
    renderViewer();
    await screen.findByRole('heading', { name: 'Renaissance' });
    await applyTimeframe('1500', '1540');
    const left = screen.getByRole('button', { name: 'Move to earlier years' });
    const right = screen.getByRole('button', { name: 'Move to later years' });
    expect(left).toBeDisabled(); // at the beginning
    expect(right).toBeEnabled();

    await userEvent.click(right);
    expect(screen.getByTestId('viewer-range')).toHaveTextContent('1520 \u2013 1560');
    expect(left).toBeEnabled();
    await userEvent.click(right);
    await userEvent.click(right);
    await userEvent.click(right);
    expect(screen.getByTestId('viewer-range')).toHaveTextContent('1560 \u2013 1600');
    expect(right).toBeDisabled(); // at the end

    await userEvent.click(left);
    expect(screen.getByTestId('viewer-range')).toHaveTextContent('1540 \u2013 1580');
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
