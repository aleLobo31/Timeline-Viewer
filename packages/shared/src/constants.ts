export const MATERIAL_TYPES = ['TIMELINE', 'FAMILY_TREE', 'MAP'] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  TIMELINE: 'Timeline',
  FAMILY_TREE: 'Family Tree',
  MAP: 'Map',
};

export const ITEM_KINDS = ['EVENT', 'PROCESS', 'PERIOD'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** US-F1.2: Crown, Swords, Skull, Scroll, White pigeon */
export const EVENT_ICONS = ['CROWN', 'SWORDS', 'SKULL', 'SCROLL', 'DOVE'] as const;
export type EventIcon = (typeof EVENT_ICONS)[number];

export const EVENT_ICON_LABELS: Record<EventIcon, string> = {
  CROWN: 'Crown',
  SWORDS: 'Swords',
  SKULL: 'Skull',
  SCROLL: 'Scroll',
  DOVE: 'White pigeon',
};

/** Emoji glyphs used to draw the icons without any asset pipeline. */
export const EVENT_ICON_GLYPHS: Record<EventIcon, string> = {
  CROWN: '\u{1F451}',
  SWORDS: '\u2694\uFE0F',
  SKULL: '\u{1F480}',
  SCROLL: '\u{1F4DC}',
  DOVE: '\u{1F54A}\uFE0F',
};

/**
 * US-F1.3 / US-F1.4: 16 selectable colors. All are dark enough to carry white
 * text with a WCAG AA contrast ratio (>= 4.5), which a unit test verifies.
 */
export const COLOR_PALETTE = [
  { key: 'red', label: 'Red', hex: '#b91c1c' },
  { key: 'orange', label: 'Orange', hex: '#c2410c' },
  { key: 'amber', label: 'Amber', hex: '#92400e' },
  { key: 'lime', label: 'Olive', hex: '#4d7c0f' },
  { key: 'green', label: 'Green', hex: '#15803d' },
  { key: 'teal', label: 'Teal', hex: '#0f766e' },
  { key: 'cyan', label: 'Cyan', hex: '#0e7490' },
  { key: 'sky', label: 'Sky', hex: '#0369a1' },
  { key: 'blue', label: 'Blue', hex: '#1d4ed8' },
  { key: 'indigo', label: 'Indigo', hex: '#4338ca' },
  { key: 'violet', label: 'Violet', hex: '#6d28d9' },
  { key: 'purple', label: 'Purple', hex: '#7e22ce' },
  { key: 'fuchsia', label: 'Fuchsia', hex: '#a21caf' },
  { key: 'pink', label: 'Pink', hex: '#be185d' },
  { key: 'brown', label: 'Brown', hex: '#78350f' },
  { key: 'slate', label: 'Slate', hex: '#475569' },
] as const;

export type ColorKey = (typeof COLOR_PALETTE)[number]['key'];
export const COLOR_KEYS = COLOR_PALETTE.map((c) => c.key) as [ColorKey, ...ColorKey[]];

export function colorHex(key: string): string {
  return COLOR_PALETTE.find((c) => c.key === key)?.hex ?? '#475569';
}

export const SHARE_METHODS = ['LINK', 'QR'] as const;
export type ShareMethod = (typeof SHARE_METHODS)[number];

export const YEAR_MIN = -10000;
export const YEAR_MAX = 10000;
