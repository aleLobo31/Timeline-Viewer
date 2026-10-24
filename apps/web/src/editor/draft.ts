import type { ColorKey, EventIcon, ItemKind, TimelineDto } from '@timeline-viewer/shared';

export const KIND_LABEL: Record<ItemKind, string> = {
  EVENT: 'Historical event',
  PROCESS: 'Historical process',
  PERIOD: 'Historical period',
};

/** Form-friendly representation: numbers are kept as the strings typed by the user. */
export interface DraftItem {
  key: string;
  kind: ItemKind;
  // events
  year: string;
  month: string;
  day: string;
  /** '' = the event has no icon */
  icon: EventIcon | '';
  imageUrl: string | null;
  // processes and periods
  startYear: string;
  endYear: string;
  color: ColorKey | '';
  // all
  name: string;
  description: string;
}

export interface Draft {
  name: string;
  description: string;
  /** optional library cover; never taken from the items */
  coverImage: string | null;
  items: DraftItem[];
}

let counter = 0;
export const newKey = () => `k${Date.now().toString(36)}${(counter++).toString(36)}`;

export function emptyItem(kind: ItemKind): DraftItem {
  return {
    key: newKey(),
    kind,
    year: '',
    month: '',
    day: '',
    icon: '',
    imageUrl: null,
    startYear: '',
    endYear: '',
    color: '',
    name: '',
    description: '',
  };
}

export const emptyDraft = (): Draft => ({ name: '', description: '', coverImage: null, items: [] });

const str = (n: number | null | undefined) => (n == null ? '' : String(n));

export function draftFromDto(
  dto: Pick<TimelineDto, 'name' | 'description' | 'coverImage' | 'items'>,
): Draft {
  return {
    name: dto.name,
    description: dto.description,
    coverImage: dto.coverImage ?? null,
    items: dto.items.map((item) => {
      const base = emptyItem(item.kind);
      if (item.kind === 'EVENT') {
        return {
          ...base,
          key: item.id,
          year: str(item.year),
          month: str(item.month),
          day: str(item.day),
          icon: item.icon ?? '',
          imageUrl: item.imageUrl ?? null,
          name: item.name,
          description: item.description,
        };
      }
      return {
        ...base,
        key: item.id,
        startYear: str(item.startYear),
        endYear: str(item.endYear),
        color: item.color,
        name: item.name,
        description: item.description ?? '',
      };
    }),
  };
}

/** Empty text becomes undefined (=> "required" message), anything else a number (NaN => "must be a number"). */
const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
const optNum = (s: string) => (s.trim() === '' ? null : Number(s));

/** Raw payload for validateTimeline / the API. */
export function draftToPayload(draft: Draft) {
  return {
    name: draft.name,
    description: draft.description,
    coverImage: draft.coverImage,
    items: draft.items.map((i) =>
      i.kind === 'EVENT'
        ? {
            kind: 'EVENT',
            id: i.key,
            year: num(i.year),
            month: optNum(i.month),
            day: optNum(i.day),
            icon: i.icon || null,
            name: i.name,
            description: i.description,
            imageUrl: i.imageUrl,
          }
        : {
            kind: i.kind,
            id: i.key,
            startYear: num(i.startYear),
            endYear: num(i.endYear),
            name: i.name,
            description: i.description,
            color: i.color || undefined,
          },
    ),
  };
}

export const FIELD_PREFIX = 'items';

/** An item of the summary list together with its position in `draft.items` (used for validation paths). */
export interface ListEntry {
  item: DraftItem;
  index: number;
}

/** Sortable date of an item: year first, then month and day (events). Items without a year come first. */
function dateKey(item: DraftItem): [number, number] {
  const year = Number(item.kind === 'EVENT' ? item.year : item.startYear);
  const hasYear = (item.kind === 'EVENT' ? item.year : item.startYear).trim() !== '';
  const monthDay =
    item.kind === 'EVENT' ? Number(item.month || 0) * 100 + Number(item.day || 0) : 0;
  return [hasYear && Number.isFinite(year) ? year : Infinity, monthDay || 0];
}

/**
 * Items ordered for the summary list: most recent on top, oldest at the bottom.
 * The item being edited stays at the position it had when it was opened, so the
 * form does not jump around while its date is typed.
 */
export function sortForList(
  items: readonly DraftItem[],
  pinned: { key: string; index: number } | null = null,
): ListEntry[] {
  const entries = items.map((item, index) => ({ item, index }));
  const compare = (a: ListEntry, b: ListEntry) => {
    const [ay, am] = dateKey(a.item);
    const [by, bm] = dateKey(b.item);
    if (ay !== by) return ay === Infinity ? -1 : by === Infinity ? 1 : by - ay;
    return bm - am;
  };
  const pinnedEntry = pinned ? entries.find((e) => e.item.key === pinned.key) : undefined;
  if (!pinned || !pinnedEntry) return [...entries].sort(compare);
  const rest = entries.filter((e) => e !== pinnedEntry).sort(compare);
  rest.splice(Math.min(pinned.index, rest.length), 0, pinnedEntry);
  return rest;
}
