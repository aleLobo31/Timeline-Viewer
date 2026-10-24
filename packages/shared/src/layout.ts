import type { TimelineItem } from './schemas';

export interface YearRange {
  from: number;
  to: number;
}

/** Overall range covered by the items of a timeline, or null when it has none. */
export function timelineRange(items: readonly TimelineItem[]): YearRange | null {
  if (items.length === 0) return null;
  let from = Infinity;
  let to = -Infinity;
  for (const item of items) {
    const start = item.kind === 'EVENT' ? item.year : item.startYear;
    const end = item.kind === 'EVENT' ? item.year : item.endYear;
    if (start < from) from = start;
    if (end > to) to = end;
  }
  return { from, to };
}

// ------------------------------------------------------------------ lane packing

interface Interval {
  startYear: number;
  endYear: number;
}

/**
 * Year used as the right edge when deciding if two bars collide. A bar that
 * starts and ends in the same year still occupies some width, so it is given
 * half a year; bars that merely touch (1500-1550 and 1550-1600) don't collide.
 */
function effectiveEnd(item: Interval): number {
  return item.endYear > item.startYear ? item.endYear : item.startYear + 0.5;
}

export interface LanePacking {
  /** lane[i] is the lane (0 = closest to the axis) assigned to input item i */
  lanes: number[];
  laneCount: number;
}

/**
 * Greedy interval-graph colouring (US-F1.3 / US-F1.4): items that overlap in
 * time - including items with identical start and end - end up in different
 * lanes, so they are drawn one above the other and never over each other.
 * Deterministic: ties are broken by input order.
 */
export function packLanes(items: readonly Interval[]): LanePacking {
  const order = items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        a.item.startYear - b.item.startYear ||
        effectiveEnd(b.item) - effectiveEnd(a.item) ||
        a.index - b.index,
    );

  const laneEnds: number[] = [];
  const lanes = new Array<number>(items.length).fill(0);

  for (const { item, index } of order) {
    let lane = laneEnds.findIndex((end) => end <= item.startYear);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = effectiveEnd(item);
    lanes[index] = lane;
  }

  return { lanes, laneCount: laneEnds.length };
}

// ------------------------------------------------------------------ tourist window (US-F1.6)

export type TimeframeResult = { ok: true; window: YearRange } | { ok: false; message: string };

/**
 * Validates a subset timeframe against the overall range of the timeline.
 * Inputs are the raw values typed by the tourist (possibly NaN / non integer).
 */
export function validateTimeframe(full: YearRange, from: number, to: number): TimeframeResult {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return { ok: false, message: 'Enter both a start year and an end year as whole numbers.' };
  }
  if (from >= to) {
    return { ok: false, message: 'The start year must be earlier than the end year.' };
  }
  if (from < full.from || to > full.to) {
    return {
      ok: false,
      message: `The timeframe must be inside the timeline, which goes from ${full.from} to ${full.to}.`,
    };
  }
  return { ok: true, window: { from, to } };
}

export interface PanAvailability {
  left: boolean;
  right: boolean;
}

/** Left is blocked at the beginning of the timeline and right at its end. */
export function canPan(full: YearRange, window: YearRange): PanAvailability {
  return { left: window.from > full.from, right: window.to < full.to };
}

export function defaultPanStep(window: YearRange): number {
  return Math.max(1, Math.floor((window.to - window.from) / 2));
}

/** Moves the window keeping its width, never going past the timeline bounds. */
export function panWindow(
  full: YearRange,
  window: YearRange,
  direction: 'left' | 'right',
  step: number = defaultPanStep(window),
): YearRange {
  const width = window.to - window.from;
  const delta = direction === 'left' ? -step : step;
  let from = window.from + delta;
  from = Math.max(full.from, Math.min(from, full.to - width));
  return { from, to: from + width };
}

/** Items that are at least partly visible inside the window ("cut" timeline). */
export function cutItems(items: readonly TimelineItem[], window: YearRange): TimelineItem[] {
  return items.filter((item) => {
    if (item.kind === 'EVENT') return item.year >= window.from && item.year <= window.to;
    return item.endYear >= window.from && item.startYear <= window.to;
  });
}

/** Compares two events chronologically (year, month, day; unknown date first). */
export function compareEvents(
  a: { year: number; month?: number | null; day?: number | null },
  b: { year: number; month?: number | null; day?: number | null },
): number {
  return a.year - b.year || (a.month ?? 0) - (b.month ?? 0) || (a.day ?? 0) - (b.day ?? 0);
}
