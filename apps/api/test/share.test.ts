import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, resetDb, sampleTimeline, signUp } from './helpers';

const { app, db } = createTestContext();

beforeEach(() => resetDb(db));
afterAll(async () => {
  await resetDb(db);
  await db.$disconnect();
});

async function guideWithTimeline() {
  const guide = await signUp(app, 'g@example.com');
  const timeline = (await guide.post('/api/timelines').send(sampleTimeline())).body.timeline;
  return { guide, timeline };
}

describe('sharing (US-F1.5)', () => {
  it.each(['LINK', 'QR'] as const)(
    'a tourist can view a timeline shared through %s',
    async (method) => {
      const { guide, timeline } = await guideWithTimeline();
      const res = await guide
        .post('/api/shares')
        .send({ materialIds: [timeline.id], method })
        .expect(200);
      const share = res.body.shares[0].share;
      expect(share.method).toBe(method);
      expect(share.path).toBe(`/s/${share.token}`);
      expect(share.token).toMatch(/^[A-Za-z0-9_-]{22}$/);

      // tourist: no session at all
      const tourist = await request(app).get(`/api/public/s/${share.token}`).expect(200);
      expect(tourist.headers['cache-control']).toBe('no-store');
      expect(tourist.body.timeline.name).toBe('Roman Empire');
      expect(tourist.body.timeline.items).toHaveLength(3);
      expect(JSON.stringify(tourist.body)).not.toMatch(/ownerId|email|passwordHash/);

      expect((await guide.get('/api/materials')).body.materials[0].shared).toBe(true);
    },
  );

  it('timelines that are not shared are not visible for tourists', async () => {
    const { timeline } = await guideWithTimeline();
    await request(app).get(`/api/public/s/${timeline.id}`).expect(404);
    await request(app).get('/api/public/s/AAAAAAAAAAAAAAAAAAAAAA').expect(404);
    await request(app).get(`/api/timelines/${timeline.id}`).expect(401);
  });

  it('shares several timelines at once and keeps the token on re-share', async () => {
    const { guide, timeline } = await guideWithTimeline();
    const second = (await guide.post('/api/timelines').send(sampleTimeline({ name: 'Second' })))
      .body.timeline;
    const res = await guide
      .post('/api/shares')
      .send({ materialIds: [timeline.id, second.id], method: 'LINK' })
      .expect(200);
    expect(res.body.shares).toHaveLength(2);
    const again = await guide
      .post('/api/shares')
      .send({ materialIds: [timeline.id], method: 'QR' })
      .expect(200);
    expect(again.body.shares[0].share.token).toBe(
      res.body.shares.find((s: { materialId: string }) => s.materialId === timeline.id).share.token,
    );
    expect(again.body.shares[0].share.method).toBe('QR');
  });

  it('requires at least one timeline and a valid method', async () => {
    const { guide } = await guideWithTimeline();
    await guide.post('/api/shares').send({ materialIds: [], method: 'LINK' }).expect(400);
    await guide
      .post('/api/shares')
      .send({ materialIds: ['x'], method: 'EMAIL' })
      .expect(400);
  });

  it('cannot share timelines of other guides', async () => {
    const { timeline } = await guideWithTimeline();
    const other = await signUp(app, 'other@example.com');
    await other
      .post('/api/shares')
      .send({ materialIds: [timeline.id], method: 'LINK' })
      .expect(404);
    await other.delete(`/api/materials/${timeline.id}/share`).expect(404);
  });

  it('stops being visible once unshared or deleted', async () => {
    const { guide, timeline } = await guideWithTimeline();
    const token = (
      await guide.post('/api/shares').send({ materialIds: [timeline.id], method: 'LINK' })
    ).body.shares[0].share.token;
    await request(app).get(`/api/public/s/${token}`).expect(200);
    await guide.delete(`/api/materials/${timeline.id}/share`).expect(204);
    await request(app).get(`/api/public/s/${token}`).expect(404);

    const token2 = (
      await guide.post('/api/shares').send({ materialIds: [timeline.id], method: 'LINK' })
    ).body.shares[0].share.token;
    await guide.delete(`/api/timelines/${timeline.id}`).expect(204);
    await request(app).get(`/api/public/s/${token2}`).expect(404);
  });

  it('shows the latest saved version to tourists', async () => {
    const { guide, timeline } = await guideWithTimeline();
    const token = (
      await guide.post('/api/shares').send({ materialIds: [timeline.id], method: 'LINK' })
    ).body.shares[0].share.token;
    await guide
      .put(`/api/timelines/${timeline.id}`)
      .send(sampleTimeline({ name: 'Renamed' }))
      .expect(200);
    const res = await request(app).get(`/api/public/s/${token}`).expect(200);
    expect(res.body.timeline.name).toBe('Renamed');
  });
});
