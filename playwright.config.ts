import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const apiEnv = {
  // NODE_ENV=test only disables the login rate limiter so e2e runs can register many users.
  NODE_ENV: 'test',
  PORT: '4000',
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://timeline:timeline@localhost:5432/timeline?schema=public',
  JWT_SECRET: process.env.JWT_SECRET ?? 'e2e-secret-e2e-secret-e2e-secret-e2e-secret',
  WEB_ORIGIN: 'http://localhost:5173',
  UPLOAD_DIR: './uploads-e2e',
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
    baseURL: 'http://localhost:5173',
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
      url: 'http://localhost:4000/api/health',
      env: apiEnv,
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -w @timeline-viewer/web',
      url: 'http://localhost:5173',
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
  ],
});
