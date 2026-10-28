import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { sessionCookieOptions } from '../src/middleware/auth';
import { createPrisma } from '../src/db';

const baseEnv = {
  DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
  JWT_SECRET: 'test-secret-test-secret-test-secret-123',
  UPLOAD_DIR: './uploads-unused',
  WEB_ORIGIN: 'https://localhost:5173',
};
const tlsEnv = { TLS_KEY_FILE: 'key.pem', TLS_CERT_FILE: 'cert.pem' };

describe('HTTPS only configuration', () => {
  it('rejects an http:// WEB_ORIGIN', () => {
    expect(() =>
      loadConfig({ ...baseEnv, ...tlsEnv, NODE_ENV: 'production', WEB_ORIGIN: 'http://a.test' }),
    ).toThrow(/WEB_ORIGIN must be an https/);
  });

  it('defaults WEB_ORIGIN to https', () => {
    const { WEB_ORIGIN: _ignored, ...env } = baseEnv;
    expect(loadConfig({ ...env, ...tlsEnv, NODE_ENV: 'production' }).WEB_ORIGIN).toBe(
      'https://localhost:5173',
    );
  });

  it.each(['TLS_KEY_FILE', 'TLS_CERT_FILE'])('requires %s outside tests', (missing) => {
    const env = { ...baseEnv, ...tlsEnv, NODE_ENV: 'production' } as Record<string, string>;
    delete env[missing];
    expect(() => loadConfig(env)).toThrow(new RegExp(`${missing} is required`));
  });

  it('does not require TLS files in tests (in-process)', () => {
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'test' })).not.toThrow();
  });
});

describe('session cookie', () => {
  it('is HttpOnly, SameSite=Lax and Secure outside tests', () => {
    const config = loadConfig({ ...baseEnv, ...tlsEnv, NODE_ENV: 'development' });
    expect(sessionCookieOptions(config)).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    });
  });
});

describe('plain HTTP requests', () => {
  it('are refused by the app outside tests', async () => {
    const config = loadConfig({ ...baseEnv, ...tlsEnv, NODE_ENV: 'development' });
    const app = createApp(config, createPrisma(baseEnv.DATABASE_URL));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('HTTPS_REQUIRED');
  });
});
