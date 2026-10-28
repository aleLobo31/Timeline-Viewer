import { existsSync, readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createPrisma } from '../src/db';

function dotEnvValue(key: string): string | undefined {
  const file = path.resolve(__dirname, '../.env');
  if (!existsSync(file)) return undefined;
  const m = new RegExp(`^${key}\\s*=\\s*"?([^"\\r\\n]*)"?`, 'm').exec(readFileSync(file, 'utf8'));
  return m?.[1];
}

export function createTestContext() {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? dotEnvValue('TEST_DATABASE_URL');
  if (!databaseUrl) throw new Error('TEST_DATABASE_URL is not set');
  const uploadDir = mkdtempSync(path.join(os.tmpdir(), 'tv-uploads-'));
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    JWT_SECRET: 'test-secret-test-secret-test-secret-123',
    WEB_ORIGIN: 'https://localhost:5173',
    UPLOAD_DIR: uploadDir,
  });
  const db = createPrisma(databaseUrl);
  const app = createApp(config, db);
  return { app, db, config };
}

export async function resetDb(db: ReturnType<typeof createPrisma>) {
  await db.shareLink.deleteMany();
  await db.timelineItem.deleteMany();
  await db.material.deleteMany();
  await db.user.deleteMany();
}

export const STRONG_PASSWORD = 'Str0ng!Passw0rd';

/** Registers a user and returns a supertest agent that keeps the session cookie. */
export async function signUp(app: ReturnType<typeof createApp>, email: string, name = 'Guide') {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({ email, name, password: STRONG_PASSWORD });
  if (res.status !== 201)
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export const sampleTimeline = (over: Record<string, unknown> = {}) => ({
  name: 'Roman Empire',
  description: 'From Augustus to the fall of the West',
  items: [
    {
      kind: 'EVENT',
      year: 476,
      day: 4,
      month: 9,
      icon: 'CROWN',
      name: 'Fall of Rome',
      description: 'Romulus Augustulus is deposed',
    },
    { kind: 'PERIOD', startYear: -27, endYear: 476, name: 'Empire', color: 'red' },
    {
      kind: 'PROCESS',
      startYear: 100,
      endYear: 200,
      name: 'Pax Romana',
      color: 'blue',
      description: 'Peace',
    },
  ],
  ...over,
});
