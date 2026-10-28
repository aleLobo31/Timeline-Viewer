import { describe, expect, it } from 'vitest';
import { draftToPayload, emptyDraft, emptyItem, sortForList, type DraftItem } from './draft';
import { dateLabel } from './ItemSummaryRow';

const event = (name: string, year: string, extra: Partial<DraftItem> = {}): DraftItem => ({
  ...emptyItem('EVENT'),
  name,
  year,
  ...extra,
});
const range = (
  name: string,
  startYear: string,
  kind: 'PERIOD' | 'PROCESS' = 'PERIOD',
): DraftItem => ({
  ...emptyItem(kind),
  name,
  startYear,
  endYear: String(Number(startYear) + 10),
});

const names = (entries: { item: DraftItem }[]) => entries.map((e) => e.item.name);

describe('sortForList', () => {
  it('puts the most recent item on top and the oldest at the bottom', () => {
    const items = [event('old', '-500'), range('mid', '1000'), event('new', '1900')];
    expect(names(sortForList(items))).toEqual(['new', 'mid', 'old']);
  });

  it('orders events of the same year by month and day, latest first', () => {
    const items = [
      event('jan', '1500', { month: '1', day: '5' }),
      event('dec', '1500', { month: '12', day: '1' }),
      event('jan-late', '1500', { month: '1', day: '20' }),
    ];
    expect(names(sortForList(items))).toEqual(['dec', 'jan-late', 'jan']);
  });

  it('keeps items without a date on top and remembers the draft index', () => {
    const items = [event('a', '1000'), event('blank', ''), event('b', '2000')];
    const sorted = sortForList(items);
    expect(names(sorted)).toEqual(['blank', 'b', 'a']);
    expect(sorted.map((e) => e.index)).toEqual([1, 2, 0]);
  });

  it('keeps the pinned (open) item in place while its date changes', () => {
    const items = [event('a', '1000'), event('b', '2000'), event('c', '3000')];
    expect(names(sortForList(items, { key: items[1]!.key, index: 1 }))).toEqual(['c', 'b', 'a']);
    const moved = items.map((i) => (i.name === 'b' ? { ...i, year: '10' } : i));
    expect(names(sortForList(moved, { key: items[1]!.key, index: 1 }))).toEqual(['c', 'b', 'a']);
    expect(names(sortForList(moved))).toEqual(['c', 'a', 'b']);
  });
});

describe('dateLabel', () => {
  it('describes events and ranges, and tells when there is no date yet', () => {
    expect(dateLabel(event('x', '1492'))).toBe('1492');
    expect(dateLabel(event('x', '1492', { day: '12', month: '10' }))).toBe('12 Oct 1492');
    expect(dateLabel(range('x', '1500'))).toBe('1500 \u2013 1510');
    expect(dateLabel(event('x', ''))).toBe('No date');
  });
});

describe('draftToPayload', () => {
  it('sends the explicit cover, never one taken from an event image', () => {
    const draft = {
      ...emptyDraft(),
      items: [event('x', '1', { imageUrl: '/uploads/a.webp' })],
    };
    expect(draftToPayload(draft).coverImage).toBeNull();
    expect(draftToPayload({ ...draft, coverImage: '/uploads/c.webp' }).coverImage).toBe(
      '/uploads/c.webp',
    );
  });
});
