import { createApp } from './app';
import { loadConfig } from './config';
import { createPrisma } from './db';

const config = loadConfig();
const db = createPrisma(config.DATABASE_URL);
const app = createApp(config, db);

const server = app.listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`);
});

const shutdown = () => {
  server.close(() => {
    void db.$disconnect().finally(() => process.exit(0));
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
