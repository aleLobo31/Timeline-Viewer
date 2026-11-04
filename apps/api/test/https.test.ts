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

  it('cannot be disguised with X-Forwarded-Proto when no proxy is trusted', async () => {
    const config = loadConfig({ ...baseEnv, ...tlsEnv, NODE_ENV: 'development' });
    const app = createApp(config, createPrisma(baseEnv.DATABASE_URL));
    const res = await request(app).get('/api/health').set('X-Forwarded-Proto', 'https');
    expect(res.status).toBe(403);
  });
});

describe('behind a reverse proxy (TRUST_PROXY)', () => {
  const proxyEnv = { ...baseEnv, ...tlsEnv, NODE_ENV: 'production', TRUST_PROXY: 'loopback' };

  it.each(['true', 'false', '1'])('refuses TRUST_PROXY=%s (would trust every client)', (value) => {
    expect(() => loadConfig({ ...proxyEnv, TRUST_PROXY: value })).toThrow(/TRUST_PROXY must name/);
  });

  it('keeps TRUST_PROXY and HOST optional', () => {
    const { TRUST_PROXY: _ignored, ...env } = proxyEnv;
    const config = loadConfig(env);
    expect(config.TRUST_PROXY).toBeUndefined();
    expect(config.HOST).toBeUndefined();
  });

  it('uses the forwarded client address only from the trusted proxy', () => {
    const app = createApp(loadConfig(proxyEnv), createPrisma(baseEnv.DATABASE_URL));
    expect(app.get('trust proxy')).toBe('loopback');
  });

  it('still refuses plain HTTP that the proxy did not mark as HTTPS', async () => {
    const app = createApp(loadConfig(proxyEnv), createPrisma(baseEnv.DATABASE_URL));
    const plain = await request(app).get('/api/health').set('X-Forwarded-Proto', 'http');
    expect(plain.status).toBe(403);
    const secure = await request(app).get('/api/health').set('X-Forwarded-Proto', 'https');
    expect(secure.status).toBe(200);
  });
});
