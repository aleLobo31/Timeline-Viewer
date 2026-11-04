import { readFileSync } from 'node:fs';
import https from 'node:https';
import { createApp } from './app';
import { loadConfig } from './config';
import { createPrisma } from './db';

const config = loadConfig();
const db = createPrisma(config.DATABASE_URL);
const app = createApp(config, db);

// HTTPS only: there is deliberately no plain HTTP listener.
const server = https
  .createServer(
    {
      key: readFileSync(config.TLS_KEY_FILE!),
      cert: readFileSync(config.TLS_CERT_FILE!),
    },
    app,
  )
  .listen({ port: config.PORT, host: config.HOST }, () => {
    console.log(`API listening on https://${config.HOST ?? 'localhost'}:${config.PORT}`);
  });

const shutdown = () => {
  server.close(() => {
    void db.$disconnect().finally(() => process.exit(0));
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
