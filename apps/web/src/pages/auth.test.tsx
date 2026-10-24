import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../test-utils';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

const unauthenticated = {
  'GET /api/auth/me': () => ({
    status: 401,
    body: { error: { code: 'UNAUTHORIZED', message: 'no' } },
  }),
};

afterEach(() => vi.unstubAllGlobals());

describe('RegisterPage (US-F1.7)', () => {
  it('explains each password rule that is not met without calling the API', async () => {
    const calls = mockFetch(unauthenticated);
    renderApp(<RegisterPage />);
    await userEvent.type(screen.getByLabelText('Name'), 'Ann');
    await userEvent.type(screen.getByLabelText('Email'), 'ann@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'weak');
    await userEvent.click(screen.getByRole('button', { name: 'Create profile' }));
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map((a) => a.textContent).join(' ')).toMatch(/at least 8 characters/);
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('shows the server explanation when the email is already used', async () => {
    mockFetch({
      ...unauthenticated,
      'POST /api/auth/register': () => ({
        status: 409,
        body: {
          error: {
            code: 'CONFLICT',
            message: 'This email is already associated with another profile.',
            issues: [
              {
                path: ['email'],
                message: 'This email is already associated with another profile.',
              },
            ],
          },
        },
      }),
    });
    renderApp(<RegisterPage />);
    await userEvent.type(screen.getByLabelText('Name'), 'Ann');
    await userEvent.type(screen.getByLabelText('Email'), 'ann@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ng!Passw0rd');
    await userEvent.click(screen.getByRole('button', { name: 'Create profile' }));
    expect(await screen.findByText(/already associated/)).toBeInTheDocument();
  });
});

describe('LoginPage (US-F1.8)', () => {
  it('requires email and password', async () => {
    mockFetch(unauthenticated);
    renderApp(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
  });

  it('shows why the login was rejected', async () => {
    mockFetch({
      ...unauthenticated,
      'POST /api/auth/login': () => ({
        status: 401,
        body: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'The email or the password is incorrect. Check both and try again.',
          },
        },
      }),
    });
    renderApp(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'ann@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/email or the password is incorrect/),
    );
  });
});
