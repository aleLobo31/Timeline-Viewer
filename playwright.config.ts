import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const certsDir = path.resolve('certs');
const apiEnv = {
  // NODE_ENV=test only disables the login rate limiter so e2e runs can register many users.
  NODE_ENV: 'test',
  PORT: '4000',
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://timeline:timeline@localhost:5432/timeline?schema=public',
  JWT_SECRET: process.env.JWT_SECRET ?? 'e2e-secret-e2e-secret-e2e-secret-e2e-secret',
  WEB_ORIGIN: 'https://localhost:5173',
  UPLOAD_DIR: './uploads-e2e',
  // HTTPS only: run `npm run certs` (mkcert) once; the files are not committed.
  TLS_KEY_FILE: process.env.TLS_KEY_FILE ?? path.join(certsDir, 'localhost-key.pem'),
  TLS_CERT_FILE: process.env.TLS_CERT_FILE ?? path.join(certsDir, 'localhost.pem'),
};

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'https://localhost:5173',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    // Q-1: tourists use phones. Chromium with a phone viewport and touch.
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
  webServer: [
    {
      command: 'npm run start -w @timeline-viewer/api',
      url: 'https://localhost:4000/api/health',
      ignoreHTTPSErrors: true,
      env: apiEnv,
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -w @timeline-viewer/web',
      url: 'https://localhost:5173',
      ignoreHTTPSErrors: true,
      env: {
        VITE_API_PROXY: 'https://localhost:4000',
        VITE_TLS_KEY_FILE: apiEnv.TLS_KEY_FILE,
        VITE_TLS_CERT_FILE: apiEnv.TLS_CERT_FILE,
      },
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
  ],
});
