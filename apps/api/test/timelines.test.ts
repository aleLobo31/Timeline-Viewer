import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, resetDb, sampleTimeline, signUp } from './helpers';

const { app, db } = createTestContext();

beforeEach(() => resetDb(db));
afterAll(async () => {
  await resetDb(db);
  await db.$disconnect();
});

describe('timeline CRUD (US-F1.1, US-F1.10)', () => {
  it('requires a session', async () => {
    await request(app).get('/api/materials').expect(401);
    await request(app).post('/api/timelines').send(sampleTimeline()).expect(401);
  });

  it('creates a timeline with mandatory fields and items, and stores it', async () => {
    const guide = await signUp(app, 'g@example.com');
    const res = await guide.post('/api/timelines').send(sampleTimeline());
    expect(res.status).toBe(201);
    expect(res.body.timeline.items).toHaveLength(3);
    expect(res.body.timeline.items[0]).toMatchObject({
      kind: 'EVENT',
      year: 476,
      day: 4,
      month: 9,
    });

    const fetched = await guide.get(`/api/timelines/${res.body.timeline.id}`).expect(200);
    expect(fetched.body.timeline.name).toBe('Roman Empire');
    expect(fetched.body.timeline.items.map((i: { kind: string }) => i.kind)).toEqual([
      'EVENT',
      'PERIOD',
      'PROCESS',
    ]);
  });

  it('rejects a timeline missing mandatory fields and explains why', async () => {
    const guide = await signUp(app, 'g@example.com');
    const noName = await guide.post('/api/timelines').send(sampleTimeline({ name: '' }));
    expect(noName.status).toBe(400);
    expect(noName.body.error.issues[0].message).toMatch(/Timeline name is required/);

    const noItems = await guide.post('/api/timelines').send(sampleTimeline({ items: [] }));
    expect(noItems.status).toBe(400);
    expect(noItems.body.error.message).toMatch(/at least one/);

    expect(await db.material.count()).toBe(0);
  });

  it('enforces the event date rules on the server (US-F1.2)', async () => {
    const guide = await signUp(app, 'g@example.com');
    const ev = (extra: Record<string, unknown>) => ({
      kind: 'EVENT',
      year: 1492,
      icon: 'SCROLL',
      name: 'x',
      description: 'y',
      ...extra,
    });
    const sameYear = await guide
      .post('/api/timelines')
      .send(sampleTimeline({ items: [ev({}), ev({ name: 'z' })] }));
    expect(sameYear.status).toBe(400);
    expect(sameYear.body.error.message).toMatch(/exact day and month/);

    const sameDate = await guide.post('/api/timelines').send(
      sampleTimeline({
        items: [ev({ day: 12, month: 10 }), ev({ name: 'z', day: 12, month: 10 })],
      }),
    );
    expect(sameDate.status).toBe(400);
    expect(sameDate.body.error.message).toMatch(/can't share day, month and year/);
  });

  it('updates a timeline: add and delete items persist after saving (F1.10)', async () => {
    const guide = await signUp(app, 'g@example.com');
    const created = (await guide.post('/api/timelines').send(sampleTimeline())).body.timeline;

    const withExtra = {
      name: created.name,
      description: created.description,
      items: [
        ...created.items,
        {
          kind: 'EVENT',
          year: 800,
          icon: 'DOVE',
          name: 'Charlemagne',
          description: 'Crowned emperor',
        },
      ],
    };
    const added = await guide.put(`/api/timelines/${created.id}`).send(withExtra).expect(200);
    expect(added.body.timeline.items).toHaveLength(4);

    const withoutEvent = { ...withExtra, items: withExtra.items.slice(1) };
    const removed = await guide.put(`/api/timelines/${created.id}`).send(withoutEvent).expect(200);
    expect(removed.body.timeline.items).toHaveLength(3);
    expect(
      removed.body.timeline.items.some((i: { name: string }) => i.name === 'Fall of Rome'),
    ).toBe(false);

    const reread = await guide.get(`/api/timelines/${created.id}`).expect(200);
    expect(reread.body.timeline.items).toHaveLength(3);
  });

  it('keeps the old content when an update is invalid', async () => {
    const guide = await signUp(app, 'g@example.com');
    const created = (await guide.post('/api/timelines').send(sampleTimeline())).body.timeline;
    await guide
      .put(`/api/timelines/${created.id}`)
      .send({ ...sampleTimeline(), items: [] })
      .expect(400);
    const reread = await guide.get(`/api/timelines/${created.id}`).expect(200);
    expect(reread.body.timeline.items).toHaveLength(3);
  });

  it('deletes the whole timeline and removes it from the library', async () => {
    const guide = await signUp(app, 'g@example.com');
    const created = (await guide.post('/api/timelines').send(sampleTimeline())).body.timeline;
    await guide.delete(`/api/timelines/${created.id}`).expect(204);
    await guide.get(`/api/timelines/${created.id}`).expect(404);
    const lib = await guide.get('/api/materials').expect(200);
    expect(lib.body.materials).toEqual([]);
    expect(await db.timelineItem.count()).toBe(0);
  });

  it('only the owner can read, edit or delete a timeline', async () => {
    const owner = await signUp(app, 'owner@example.com');
    const other = await signUp(app, 'other@example.com');
    const created = (await owner.post('/api/timelines').send(sampleTimeline())).body.timeline;

    await other.get(`/api/timelines/${created.id}`).expect(404);
    await other.put(`/api/timelines/${created.id}`).send(sampleTimeline()).expect(404);
    await other.delete(`/api/timelines/${created.id}`).expect(404);
    await other.get('/api/timelines/not-a-uuid').expect(404);
    expect((await other.get('/api/materials')).body.materials).toEqual([]);
    expect((await owner.get('/api/materials')).body.materials).toHaveLength(1);
  });
});

describe('optional icon and word limits (US-F1.1, US-F1.2)', () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

  it('stores an event without icon', async () => {
    const guide = await signUp(app, 'g@example.com');
    const res = await guide
      .post('/api/timelines')
      .send(
        sampleTimeline({
          items: [{ kind: 'EVENT', year: 5, name: 'x', description: 'y' }],
        }),
      )
      .expect(201);
    expect(res.body.timeline.items[0].icon).toBeNull();
  });

  it('rejects descriptions above the word limits', async () => {
    const guide = await signUp(app, 'g@example.com');
    const long = await guide
      .post('/api/timelines')
      .send(sampleTimeline({ description: 'a'.repeat(101) }));
    expect(long.status).toBe(400);
    expect(long.body.error.message).toMatch(/at most 100 characters/);
    await guide
      .post('/api/timelines')
      .send(sampleTimeline({ description: 'a'.repeat(100) }))
      .expect(201);
    await guide
      .post('/api/timelines')
      .send(
        sampleTimeline({
          items: [{ kind: 'EVENT', year: 5, name: 'x', description: words(301) }],
        }),
      )
      .expect(400);
  });
});

describe('library (US-F1.9)', () => {
  it('lists materials and filters by type', async () => {
    const guide = await signUp(app, 'g@example.com');
    await guide.post('/api/timelines').send(sampleTimeline()).expect(201);
    const all = await guide.get('/api/materials').expect(200);
    expect(all.body.materials[0]).toMatchObject({
      type: 'TIMELINE',
      name: 'Roman Empire',
      shared: false,
    });
    expect((await guide.get('/api/materials?type=TIMELINE')).body.materials).toHaveLength(1);
    expect((await guide.get('/api/materials?type=MAP')).body.materials).toHaveLength(0);
    await guide.get('/api/materials?type=BOGUS').expect(400);
  });
});

describe('image upload (F1.2)', () => {
  it('resizes images to webp and rejects non-images', async () => {
    const guide = await signUp(app, 'g@example.com');
    const png = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: '#336699' },
    })
      .png()
      .toBuffer();
    const ok = await guide
      .post('/api/uploads/image')
      .attach('image', png, { filename: 'a.png', contentType: 'image/png' });
    expect(ok.status).toBe(201);
    expect(ok.body.url).toMatch(/^\/uploads\/[\w-]+\.webp$/);

    const served = await request(app).get(ok.body.url).expect(200);
    const meta = await sharp(served.body).metadata();
    expect(meta.format).toBe('webp');
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1280);

    const bad = await guide
      .post('/api/uploads/image')
      .attach('image', Buffer.from('not an image'), {
        filename: 'a.png',
        contentType: 'image/png',
      });
    expect(bad.status).toBe(400);
    const wrongType = await guide
      .post('/api/uploads/image')
      .attach('image', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(wrongType.status).toBe(400);
    await request(app).post('/api/uploads/image').expect(401);

    // an event image never becomes the library cover
    const tl = await guide
      .post('/api/timelines')
      .send(
        sampleTimeline({
          items: [
            {
              kind: 'EVENT',
              year: 1,
              icon: 'SCROLL',
              name: 'x',
              description: 'y',
              imageUrl: ok.body.url,
            },
          ],
        }),
      )
      .expect(201);
    expect(tl.body.timeline.items[0].imageUrl).toBe(ok.body.url);
    expect(tl.body.timeline.coverImage).toBeNull();
    expect((await guide.get('/api/materials')).body.materials[0].coverImage).toBeNull();

    // an explicit cover is stored, shown in the library and can be removed
    const covered = await guide
      .post('/api/timelines')
      .send(sampleTimeline({ coverImage: ok.body.url }))
      .expect(201);
    expect(covered.body.timeline.coverImage).toBe(ok.body.url);
    const library = (await guide.get('/api/materials')).body.materials as {
      id: string;
      coverImage: string | null;
    }[];
    expect(library.find((m) => m.id === covered.body.timeline.id)?.coverImage).toBe(ok.body.url);
    const cleared = await guide
      .put(`/api/timelines/${covered.body.timeline.id}`)
      .send(sampleTimeline({ coverImage: null }))
      .expect(200);
    expect(cleared.body.timeline.coverImage).toBeNull();
    await guide
      .post('/api/timelines')
      .send(sampleTimeline({ coverImage: 'https://evil.test/a.png' }))
      .expect(400);

    // arbitrary urls are not accepted
    await guide
      .post('/api/timelines')
      .send(
        sampleTimeline({
          items: [
            {
              kind: 'EVENT',
              year: 1,
              icon: 'SCROLL',
              name: 'x',
              description: 'y',
              imageUrl: 'javascript:alert(1)',
            },
          ],
        }),
      )
      .expect(400);
  });
});
