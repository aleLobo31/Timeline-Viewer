import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, resetDb, STRONG_PASSWORD } from './helpers';

const ctx = createTestContext();
const { app, db } = ctx;

beforeAll(() => resetDb(db));
beforeEach(() => resetDb(db));
afterAll(async () => {
  await resetDb(db);
  await db.$disconnect();
});

const valid = { email: 'ann@example.com', name: 'Ann', password: STRONG_PASSWORD };

describe('POST /api/auth/register (US-F1.7)', () => {
  it('creates a profile, starts a session and never stores the password in plaintext (Q-2)', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'ann@example.com', name: 'Ann' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    expect(res.headers['set-cookie']?.[0]).toMatch(/HttpOnly/i);

    const stored = await db.user.findUniqueOrThrow({ where: { email: valid.email } });
    expect(stored.passwordHash).not.toBe(STRONG_PASSWORD);
    expect(stored.passwordHash).not.toContain(STRONG_PASSWORD);
    expect(stored.passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  it.each([
    ['Sh0rt!', /at least 8/],
    ['alllowercase1!', /capital/],
    ['NoNumbersHere!', /number/],
    ['NoSpecial1234', /special/],
    ['12345678!?', /letter/],
  ])('rejects password %s and explains why', async (password, reason) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, password });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.error.issues)).toMatch(reason);
    expect(await db.user.count()).toBe(0);
  });

  it('rejects an email already associated to another profile', async () => {
    await request(app).post('/api/auth/register').send(valid).expect(201);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...valid, email: 'ANN@example.com', name: 'Other' });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already associated/);
    expect(await db.user.count()).toBe(1);
  });

  it('requires email and name', async () => {
    const res = await request(app).post('/api/auth/register').send({ password: STRONG_PASSWORD });
    expect(res.status).toBe(400);
    const paths = res.body.error.issues.map((i: { path: string[] }) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['email', 'name']));
  });
});

describe('POST /api/auth/login (US-F1.8)', () => {
  it('logs in with the right credentials and exposes the session', async () => {
    await request(app).post('/api/auth/register').send(valid).expect(201);
    const agent = request.agent(app);
    const res = await agent
      .post('/api/auth/login')
      .send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(valid.email);
  });

  it('rejects wrong password and unknown email with an explanation', async () => {
    await request(app).post('/api/auth/register').send(valid).expect(201);
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: valid.email, password: 'Wr0ng!Password' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: STRONG_PASSWORD });
    for (const res of [wrongPassword, unknown]) {
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/email or the password is incorrect/);
    }
  });

  it('requires both fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('logout clears the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(valid).expect(201);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });
});
