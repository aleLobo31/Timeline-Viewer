import { describe, expect, it } from 'vitest';
import {
  COLOR_PALETTE,
  canPan,
  checkPassword,
  countWords,
  cutItems,
  validItems,
  packLanes,
  panWindow,
  registerSchema,
  timelineRange,
  validateTimeframe,
  validateTimeline,
  eventsNeedingExactDate,
  type TimelineItem,
} from './index';

const event = (over: Record<string, unknown> = {}) => ({
  kind: 'EVENT',
  year: 1500,
  icon: 'CROWN',
  name: 'Coronation',
  description: 'A king is crowned',
  ...over,
});
const period = (over: Record<string, unknown> = {}) => ({
  kind: 'PERIOD',
  startYear: 1500,
  endYear: 1600,
  name: 'Golden age',
  color: 'blue',
  ...over,
});
const timeline = (items: unknown[], over: Record<string, unknown> = {}) => ({
  name: 'Spain',
  description: 'History of Spain',
  items,
  ...over,
});

describe('password policy (US-F1.7)', () => {
  it('accepts a strong password', () => {
    expect(checkPassword('Str0ng!pass')).toEqual([]);
  });
  it.each([
    ['Sh0rt!', 'at least 8'],
    ['12345678!', 'letter'],
    ['lowercase1!', 'capital'],
    ['NoNumbers!!', 'number'],
    ['NoSpecial123', 'special'],
  ])('rejects %s and explains why', (password, fragment) => {
    const messages = checkPassword(password);
    expect(messages.some((m) => m.includes(fragment))).toBe(true);
  });
  it('registerSchema normalises the email and reports every failed rule', () => {
    const ok = registerSchema.parse({ email: ' A@B.com ', name: 'Ann', password: 'Str0ng!pass' });
    expect(ok.email).toBe('a@b.com');
    const bad = registerSchema.safeParse({ email: 'a@b.com', name: 'Ann', password: 'abc' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues.length).toBeGreaterThan(2);
  });
});

describe('timeline validation (US-F1.1)', () => {
  it('accepts a timeline with all mandatory fields and 1 item', () => {
    expect(validateTimeline(timeline([event()])).ok).toBe(true);
  });
  it('rejects a timeline without items', () => {
    const r = validateTimeline(timeline([]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.message).toMatch(/at least one/);
  });
  it('rejects missing name and description', () => {
    const r = validateTimeline(timeline([event()], { name: '  ', description: '' }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const paths = r.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('name');
      expect(paths).toContain('description');
    }
  });
});

describe('cover image and word limits (US-F1.1)', () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

  it('accepts a timeline without cover and returns null', () => {
    const r = validateTimeline(timeline([event()]));
    expect(r.ok && r.data.coverImage).toBe(null);
  });
  it('accepts an uploaded cover and rejects any other URL', () => {
    const ok = validateTimeline(timeline([event()], { coverImage: '/uploads/abc-123.webp' }));
    expect(ok.ok && ok.data.coverImage).toBe('/uploads/abc-123.webp');
    expect(validateTimeline(timeline([event()], { coverImage: 'https://x.test/a.png' })).ok).toBe(
      false,
    );
  });
  it('limits the timeline description to 100 characters', () => {
    expect(countWords('  one   two\nthree ')).toBe(3);
    expect(validateTimeline(timeline([event()], { description: 'a'.repeat(100) })).ok).toBe(true);
    const r = validateTimeline(timeline([event()], { description: 'a'.repeat(101) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.message).toMatch(/at most 100 characters/);
  });
  it('limits item descriptions to 300 words', () => {
    expect(validateTimeline(timeline([event({ description: words(300) })])).ok).toBe(true);
    expect(validateTimeline(timeline([event({ description: words(301) })])).ok).toBe(false);
    expect(validateTimeline(timeline([period({ description: words(301) })])).ok).toBe(false);
  });
  it('allows events without an icon', () => {
    const r = validateTimeline(timeline([event({ icon: undefined })]));
    expect(r.ok && r.data.items[0]).toMatchObject({ icon: null });
    expect(validateTimeline(timeline([event({ icon: 'NOPE' })])).ok).toBe(false);
  });
  it('validItems keeps only the individually valid items', () => {
    const items = validItems([
      { ...event(), id: 'a' },
      { ...event({ name: '' }), id: 'b' },
      { ...period({ startYear: 1600, endYear: 1500 }), id: 'c' },
      { ...period(), id: 'd' },
    ]);
    expect(items.map((i) => i.id)).toEqual(['a', 'd']);
  });
});

describe('historical events (US-F1.2)', () => {
  it('requires day and month when two events share a year', () => {
    const r = validateTimeline(timeline([event(), event({ name: 'Other' })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.some((i) => /exact day and month/.test(i.message))).toBe(true);
  });
  it('accepts events in the same year with different dates', () => {
    const r = validateTimeline(
      timeline([event({ day: 1, month: 1 }), event({ name: 'Other', day: 2, month: 1 })]),
    );
    expect(r.ok).toBe(true);
  });
  it('rejects identical day, month and year', () => {
    const r = validateTimeline(
      timeline([event({ day: 1, month: 5 }), event({ name: 'Other', day: 1, month: 5 })]),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]?.message).toMatch(/can't share day, month and year/);
  });
  it('rejects half dates and impossible dates', () => {
    expect(validateTimeline(timeline([event({ day: 3 })])).ok).toBe(false);
    expect(validateTimeline(timeline([event({ day: 30, month: 2 })])).ok).toBe(false);
    expect(validateTimeline(timeline([event({ year: 1600, day: 29, month: 2 })])).ok).toBe(true);
    expect(validateTimeline(timeline([event({ year: 1700, day: 29, month: 2 })])).ok).toBe(false);
  });
  it('flags events that must give an exact date', () => {
    const items = [event(), event({ name: 'b' }), event({ year: 1700 })];
    expect([...eventsNeedingExactDate(items as never)]).toEqual([0, 1]);
  });
});

describe('processes and periods (US-F1.3, US-F1.4)', () => {
  it('requires start <= end and a palette color', () => {
    expect(validateTimeline(timeline([period({ startYear: 1600, endYear: 1500 })])).ok).toBe(false);
    expect(validateTimeline(timeline([period({ color: 'nope' })])).ok).toBe(false);
    expect(validateTimeline(timeline([period({ description: undefined })])).ok).toBe(true);
  });
  it('has 16 colors, each readable with white text (WCAG AA)', () => {
    expect(COLOR_PALETTE).toHaveLength(16);
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      }) as [number, number, number];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const { hex } of COLOR_PALETTE) {
      expect(1.05 / (lum(hex) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('lane packing', () => {
  it('puts identical ranges in different lanes', () => {
    const r = packLanes([
      { startYear: 1500, endYear: 1600 },
      { startYear: 1500, endYear: 1600 },
    ]);
    expect(r.lanes).toEqual([0, 1]);
    expect(r.laneCount).toBe(2);
  });
  it('reuses a lane for contiguous or disjoint ranges', () => {
    const r = packLanes([
      { startYear: 1500, endYear: 1550 },
      { startYear: 1550, endYear: 1600 },
      { startYear: 1700, endYear: 1710 },
    ]);
    expect(r.lanes).toEqual([0, 0, 0]);
    expect(r.laneCount).toBe(1);
  });
  it('never overlaps items sharing a lane (randomised)', () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const items = Array.from({ length: 200 }, () => {
      const s = Math.floor(rnd() * 500);
      return { startYear: s, endYear: s + Math.floor(rnd() * 80) };
    });
    const { lanes } = packLanes(items);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (lanes[i] !== lanes[j]) continue;
        const a = items[i]!;
        const b = items[j]!;
        const ae = Math.max(a.endYear, a.startYear + 0.5);
        const be = Math.max(b.endYear, b.startYear + 0.5);
        expect(a.startYear < be && b.startYear < ae).toBe(false);
      }
    }
  });
});

describe('tourist timeframe and navigation (US-F1.6)', () => {
  const full = { from: 1500, to: 1600 };
  it('accepts a valid subset', () => {
    expect(validateTimeframe(full, 1520, 1550)).toEqual({
      ok: true,
      window: { from: 1520, to: 1550 },
    });
  });
  it('rejects subsets outside the timeline or inverted', () => {
    expect(validateTimeframe(full, 1450, 1550).ok).toBe(false);
    expect(validateTimeframe(full, 1520, 1650).ok).toBe(false);
    expect(validateTimeframe(full, 1550, 1520).ok).toBe(false);
    expect(validateTimeframe(full, 1550, 1550).ok).toBe(false);
    expect(validateTimeframe(full, NaN, 1550).ok).toBe(false);
  });
  it('blocks movement at the edges and clamps while panning', () => {
    expect(canPan(full, full)).toEqual({ left: false, right: false });
    const w = { from: 1500, to: 1530 };
    expect(canPan(full, w)).toEqual({ left: false, right: true });
    const moved = panWindow(full, w, 'right');
    expect(moved).toEqual({ from: 1515, to: 1545 });
    expect(canPan(full, moved)).toEqual({ left: true, right: true });
    const end = panWindow(full, { from: 1560, to: 1590 }, 'right');
    expect(end).toEqual({ from: 1570, to: 1600 });
    expect(canPan(full, end)).toEqual({ left: true, right: false });
    expect(panWindow(full, { from: 1500, to: 1530 }, 'left')).toEqual({ from: 1500, to: 1530 });
  });
  it('cuts items to the window', () => {
    const items = [
      event({ year: 1510 }),
      event({ year: 1530, name: 'b' }),
      period({ startYear: 1490, endYear: 1515 }),
      period({ startYear: 1560, endYear: 1590, name: 'late' }),
    ] as unknown as TimelineItem[];
    const cut = cutItems(items, { from: 1520, to: 1550 });
    expect(cut.map((i) => i.name)).toEqual(['b']);
    expect(timelineRange(items)).toEqual({ from: 1490, to: 1590 });
  });
});
