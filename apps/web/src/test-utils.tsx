import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';

/** Renders UI with router + react-query + auth providers. */
export function renderApp(ui: ReactElement, route = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

type Handler = (url: string, init?: RequestInit) => { status?: number; body?: unknown };

/** Replaces fetch with a tiny router. Unmatched calls respond 404. */
export function mockFetch(handlers: Record<string, Handler>) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const h = handlers[`${method} ${url}`];
    const out = h
      ? h(url, init)
      : { status: 404, body: { error: { code: 'NOT_FOUND', message: 'nf' } } };
    return {
      ok: (out.status ?? 200) < 400,
      status: out.status ?? 200,
      json: async () => out.body,
    } as Response;
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}
