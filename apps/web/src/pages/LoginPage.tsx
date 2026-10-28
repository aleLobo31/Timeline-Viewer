import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@timeline-viewer/shared';
import { fieldErrors } from '../api/client';
import { useAuth, useLogin } from '../auth/AuthContext';
import { Field } from '../components/Field';

export function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localErrors, setLocalErrors] = useState<Record<string, string[]>>({});

  const from = (location.state as { from?: string } | null)?.from ?? '/library';
  if (user) return <Navigate to={from} replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: Record<string, string[]> = {};
      for (const i of parsed.error.issues) (errs[String(i.path[0])] ??= []).push(i.message);
      setLocalErrors(errs);
      return;
    }
    setLocalErrors({});
    login.mutate(parsed.data, { onSuccess: () => navigate(from, { replace: true }) });
  };

  const errs = { ...fieldErrors(login.error), ...localErrors };
  // Wrong credentials are reported once in the alert (no field attribution).
  const formError = login.error && !errs.email && !errs.password ? login.error.message : null;

  return (
    <main className="page page-narrow">
      <h1>Log in</h1>
      <p>Access your explanation material.</p>
      <form className="card" onSubmit={onSubmit} noValidate aria-label="Log in">
        {formError && (
          <div className="alert alert-error" role="alert">
            {formError}
          </div>
        )}
        <Field label="Email" errors={errs.email}>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" errors={errs.password}>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={login.isPending}>
          {login.isPending ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p style={{ marginTop: '1rem' }}>
        New guide? <Link to="/register">Create a profile</Link>
      </p>
    </main>
  );
}
