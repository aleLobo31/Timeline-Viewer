import {
  cutItems,
  packLanes,
  timelineRange,
  type TimelineItem,
  type YearRange,
} from '@timeline-viewer/shared';

export type WithId<T> = T & { id: string };
export type Item = WithId<TimelineItem>;
export type RangeEntry = Extract<Item, { kind: 'PROCESS' | 'PERIOD' }>;
export type EventEntry = Extract<Item, { kind: 'EVENT' }>;

export const EVENT_W = 136;
/** Side padding so the label of an event on the edge is fully visible. */
export const PAD = EVENT_W / 2 + 4;
export const BAR_H = 44;
export const BAR_GAP = 6;
export const BAR_STEP = BAR_H + BAR_GAP;
export const AXIS_H = 56;
export const EVENT_ROW_H = 104;
export const ZONE_GAP = 10;

export interface BarLayout {
  item: RangeEntry;
  left: number;
  width: number;
  /** distance from the top of its zone */
  top: number;
  clippedStart: boolean;
  clippedEnd: boolean;
}

export interface EventLayout {
  item: EventEntry;
  x: number;
  /** distance from the axis to the icon */
  offset: number;
}

export interface Tick {
  year: number;
  x: number;
}

export interface TimelineLayout {
  window: YearRange;
  width: number;
  periods: BarLayout[];
  periodsHeight: number;
  processes: BarLayout[];
  processesHeight: number;
  events: EventLayout[];
  eventsHeight: number;
  ticks: Tick[];
  /** y of the axis line from the top of the canvas */
  axisY: number;
  height: number;
}

const STEPS = [1, 2, 5];

/** Smallest "nice" step (1, 2, 5 x 10^k) giving at least `minPx` between ticks. */
export function niceStep(span: number, width: number, minPx = 90): number {
  const target = (span / Math.max(1, width - 2 * PAD)) * minPx;
  let magnitude = 1;
  for (;;) {
    for (const s of STEPS) if (s * magnitude >= target) return s * magnitude;
    magnitude *= 10;
  }
}

function layoutBars(
  entries: RangeEntry[],
  xOf: (y: number) => number,
  window: YearRange,
  width: number,
): { bars: BarLayout[]; height: number } {
  const { lanes, laneCount } = packLanes(entries);
  const bars = entries.map((item, i) => {
    const clippedStart = item.startYear < window.from;
    const clippedEnd = item.endYear > window.to;
    const left = clippedStart ? 0 : xOf(item.startYear);
    const right = clippedEnd ? width : xOf(item.endYear);
    return {
      item,
      left,
      width: Math.max(8, right - left),
      // lane 0 is the closest to the axis, so it is the lowest of the zone
      top: (laneCount - 1 - (lanes[i] ?? 0)) * BAR_STEP,
      clippedStart,
      clippedEnd,
    };
  });
  return { bars, height: laneCount * BAR_STEP };
}

/**
 * Pure layout of a timeline for a given pixel width (US-F1.2 to US-F1.4):
 * periods on top, processes below them, then the axis with the events.
 * Overlapping bars are stacked in lanes; colliding event labels in rows.
 */
export function layoutTimeline(
  allItems: readonly Item[],
  windowOverride: YearRange | null,
  width: number,
): TimelineLayout {
  const full = timelineRange(allItems) ?? { from: 0, to: 1 };
  let window = windowOverride ?? full;
  // A single-year timeline still needs a drawable span.
  if (window.to === window.from) window = { from: window.from - 5, to: window.to + 5 };

  const span = window.to - window.from;
  const usable = Math.max(1, width - 2 * PAD);
  const xOf = (year: number) => PAD + ((year - window.from) / span) * usable;

  const visible = cutItems(allItems, window) as Item[];
  const periodsIn = visible.filter((i): i is RangeEntry => i.kind === 'PERIOD');
  const processesIn = visible.filter((i): i is RangeEntry => i.kind === 'PROCESS');
  const eventsIn = visible
    .filter((i): i is EventEntry => i.kind === 'EVENT')
    .sort(
      (a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0) || (a.day ?? 0) - (b.day ?? 0),
    );

  const periods = layoutBars(periodsIn, xOf, window, width);
  const processes = layoutBars(processesIn, xOf, window, width);

  // Event labels: keep the center on the exact year, push to another row on collision.
  const centers = eventsIn.map((e) => xOf(e.year));
  const rows = packLanes(
    centers.map((x) => ({ startYear: x - EVENT_W / 2, endYear: x + EVENT_W / 2 })),
  );
  const events = eventsIn.map((item, i) => ({
    item,
    x: centers[i] ?? 0,
    offset: 14 + (rows.lanes[i] ?? 0) * EVENT_ROW_H,
  }));
  const eventsHeight = events.length ? rows.laneCount * EVENT_ROW_H + 14 : 14;

  const tickStep = niceStep(span, width);
  const ticks: Tick[] = [];
  for (let y = Math.ceil(window.from / tickStep) * tickStep; y <= window.to; y += tickStep) {
    ticks.push({ year: y, x: xOf(y) });
  }

  const topGap = (periods.height ? ZONE_GAP : 0) + (processes.height ? ZONE_GAP : 0);
  const axisY = periods.height + processes.height + topGap + AXIS_H / 2;

  return {
    window,
    width,
    periods: periods.bars,
    periodsHeight: periods.height,
    processes: processes.bars,
    processesHeight: processes.height,
    events,
    eventsHeight,
    ticks,
    axisY,
    height: axisY + AXIS_H / 2 + eventsHeight,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatYear(year: number): string {
  return year < 0 ? `${-year} BC` : String(year);
}

export function formatEventDate(e: {
  year: number;
  month?: number | null;
  day?: number | null;
}): string {
  if (e.month && e.day) return `${e.day} ${MONTHS[e.month - 1]} ${formatYear(e.year)}`;
  return formatYear(e.year);
}

export function formatRange(start: number, end: number): string {
  return start === end ? formatYear(start) : `${formatYear(start)} \u2013 ${formatYear(end)}`;
}
