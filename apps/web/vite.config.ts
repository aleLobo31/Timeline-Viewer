import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiTarget = process.env.VITE_API_PROXY ?? 'https://localhost:4000';

// HTTPS only (generate the files with `npm run certs`). Vitest doesn't need them.
const certFile = (envName: string, fallback: string) =>
  process.env[envName] ?? fileURLToPath(new URL(fallback, import.meta.url));
const tls = () => ({
  key: readFileSync(certFile('VITE_TLS_KEY_FILE', '../../certs/localhost-key.pem')),
  cert: readFileSync(certFile('VITE_TLS_CERT_FILE', '../../certs/localhost.pem')),
});

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    https: command === 'serve' && !process.env.VITEST ? tls() : undefined,
    // Same-origin API calls in dev: cookies just work and no CORS is needed.
    // `secure: false` only skips verifying the API's local mkcert certificate (loopback).
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true, secure: false },
      '/uploads': { target: apiTarget, changeOrigin: true, secure: false },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
}));
