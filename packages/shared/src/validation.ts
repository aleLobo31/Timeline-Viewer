import {
  timelineInputSchema,
  timelineItemSchema,
  type TimelineInput,
  type TimelineItem,
} from './schemas';

export interface ValidationIssue {
  /** Path inside the timeline payload, e.g. ['items', 2, 'day'] */
  path: (string | number)[];
  message: string;
}

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; issues: ValidationIssue[] };

const NO_ITEMS_ISSUE: ValidationIssue = {
  path: ['items'],
  message: 'A timeline needs at least one historical event, process or period.',
};

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function dateLabel(year: number, month: number, day: number): string {
  return `${day}/${month}/${year}`;
}

/**
 * Cross-item rules for historical events (US-F1.2):
 *  - day and month go together and must form a real calendar date;
 *  - two events can't share a year unless every one of them gives day and month;
 *  - two events can never share day + month + year.
 */
export function checkEventDates(items: readonly TimelineItem[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const byYear = new Map<number, number[]>();

  items.forEach((item, index) => {
    if (item.kind !== 'EVENT') return;

    const hasDay = item.day != null;
    const hasMonth = item.month != null;
    if (hasDay !== hasMonth) {
      issues.push({
        path: ['items', index, hasDay ? 'month' : 'day'],
        message: 'Day and month must be given together. Fill in both or leave both empty.',
      });
    } else if (hasDay && hasMonth && item.day! > daysInMonth(item.year, item.month!)) {
      issues.push({
        path: ['items', index, 'day'],
        message: `Month ${item.month} of year ${item.year} does not have ${item.day} days.`,
      });
    }

    const list = byYear.get(item.year) ?? [];
    list.push(index);
    byYear.set(item.year, list);
  });

  for (const [year, indexes] of byYear) {
    if (indexes.length < 2) continue;

    const seen = new Map<string, number>();
    for (const index of indexes) {
      const event = items[index];
      if (event?.kind !== 'EVENT') continue;

      if (event.day == null || event.month == null) {
        issues.push({
          path: ['items', index, 'day'],
          message: `Another event already uses the year ${year}. Two events can't share a year, so give the exact day and month of this event.`,
        });
        continue;
      }

      const key = `${event.month}-${event.day}`;
      if (seen.has(key)) {
        issues.push({
          path: ['items', index, 'day'],
          message: `Another event already happens on ${dateLabel(year, event.month, event.day)}. Two events of the same timeline can't share day, month and year.`,
        });
      } else {
        seen.set(key, index);
      }
    }
  }

  return issues;
}

/** Start year can't be after the end year for processes and periods. */
export function checkRanges(items: readonly TimelineItem[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  items.forEach((item, index) => {
    if (item.kind === 'EVENT') return;
    if (item.startYear > item.endYear) {
      issues.push({
        path: ['items', index, 'endYear'],
        message: 'End year must be the same as or later than the start year.',
      });
    }
  });
  return issues;
}

/**
 * Full validation of a timeline payload (US-F1.1 to US-F1.4). Used by the editor
 * for live feedback and by the API as the authoritative check.
 */
export function validateTimeline(raw: unknown): ValidationResult<TimelineInput> {
  const parsed = timelineInputSchema.safeParse(raw);
  const issues: ValidationIssue[] = [];

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      issues.push({ path: issue.path, message: issue.message });
    }
    // Report an empty item list together with the other missing fields.
    const rawItems = (raw as { items?: unknown } | null)?.items;
    if (Array.isArray(rawItems) && rawItems.length === 0) issues.push(NO_ITEMS_ISSUE);
    return { ok: false, issues };
  }

  const { items } = parsed.data;
  if (items.length === 0) issues.push(NO_ITEMS_ISSUE);
  issues.push(...checkEventDates(items), ...checkRanges(items));

  return issues.length > 0 ? { ok: false, issues } : { ok: true, data: parsed.data };
}

/**
 * Items of a raw payload that are individually valid, so a live preview can
 * show them while other items are still being filled in.
 */
export function validItems(raw: unknown): (TimelineItem & { id: string })[] {
  if (!Array.isArray(raw)) return [];
  const result: (TimelineItem & { id: string })[] = [];
  for (const candidate of raw) {
    const parsed = timelineItemSchema.safeParse(candidate);
    if (!parsed.success || typeof parsed.data.id !== 'string') continue;
    if (parsed.data.kind !== 'EVENT' && parsed.data.startYear > parsed.data.endYear) continue;
    result.push(parsed.data as TimelineItem & { id: string });
  }
  return result;
}

/** Groups issue messages by dotted path (e.g. "items.2.day") for form rendering. */
export function issuesByPath(issues: readonly ValidationIssue[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const issue of issues) {
    const key = issue.path.join('.');
    const list = map.get(key) ?? [];
    list.push(issue.message);
    map.set(key, list);
  }
  return map;
}

/**
 * Indexes of events that must provide an explicit day and month because
 * another event of the timeline shares their year (US-F1.2).
 */
export function eventsNeedingExactDate(
  items: readonly { kind: string; year?: number }[],
): Set<number> {
  const counts = new Map<number, number>();
  for (const item of items) {
    if (item.kind === 'EVENT' && typeof item.year === 'number' && Number.isFinite(item.year)) {
      counts.set(item.year, (counts.get(item.year) ?? 0) + 1);
    }
  }
  const result = new Set<number>();
  items.forEach((item, index) => {
    if (
      item.kind === 'EVENT' &&
      typeof item.year === 'number' &&
      (counts.get(item.year) ?? 0) > 1
    ) {
      result.add(index);
    }
  });
  return result;
}
