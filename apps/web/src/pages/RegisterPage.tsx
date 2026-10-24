import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { PASSWORD_RULES, registerSchema } from '@timeline-viewer/shared';
import { fieldErrors } from '../api/client';
import { useAuth, useRegister } from '../auth/AuthContext';
import { Field } from '../components/Field';

export function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localErrors, setLocalErrors] = useState<Record<string, string[]>>({});

  if (user) return <Navigate to="/library" replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const errs: Record<string, string[]> = {};
      for (const i of parsed.error.issues) (errs[String(i.path[0])] ??= []).push(i.message);
      setLocalErrors(errs);
      return;
    }
    setLocalErrors({});
    register.mutate(parsed.data, { onSuccess: () => navigate('/library', { replace: true }) });
  };

  const errs = { ...fieldErrors(register.error), ...localErrors };
  const showRules = password.length > 0 || Boolean(errs.password);
  const formError =
    register.error && !errs.email && !errs.password && !errs.name ? register.error.message : null;

  return (
    <main className="page page-narrow">
      <h1>Create a profile</h1>
      <p>Guides need a profile to create and share timelines.</p>
      <form className="card" onSubmit={onSubmit} noValidate aria-label="Create a profile">
        {formError && (
          <div className="alert alert-error" role="alert">
            {formError}
          </div>
        )}
        <Field label="Name" errors={errs.name}>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email" errors={errs.email}>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-rules"
          />
        </Field>
        <ul className="rules" id="password-rules" aria-label="Password requirements">
          {PASSWORD_RULES.map((rule) => (
            <li key={rule.id} className={showRules && rule.test(password) ? 'met' : undefined}>
              {rule.message}
            </li>
          ))}
        </ul>
        {errs.password && (
          <div className="field-error" role="alert">
            {errs.password.map((m) => (
              <div key={m}>{m}</div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary" type="submit" disabled={register.isPending}>
            {register.isPending ? 'Creating...' : 'Create profile'}
          </button>
        </div>
      </form>
      <p style={{ marginTop: '1rem' }}>
        Already have a profile? <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}
