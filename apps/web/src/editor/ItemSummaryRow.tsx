import { useId, type ReactNode } from 'react';
import { formatEventDate, formatRange } from '../components/timeline/layout';
import { KIND_LABEL, type DraftItem } from './draft';

const SHORT_KIND: Record<DraftItem['kind'], string> = {
  EVENT: 'Event',
  PROCESS: 'Process',
  PERIOD: 'Period',
};

const toInt = (s: string) => (s.trim() !== '' && Number.isInteger(Number(s)) ? Number(s) : null);

/** Short date of an item for the summary row; empty while the year is not typed yet. */
export function dateLabel(item: DraftItem): string {
  if (item.kind === 'EVENT') {
    const year = toInt(item.year);
    if (year === null) return 'No date';
    return formatEventDate({ year, month: toInt(item.month), day: toInt(item.day) });
  }
  const start = toInt(item.startYear);
  if (start === null) return 'No date';
  return formatRange(start, toInt(item.endYear) ?? start);
}

interface Props {
  item: DraftItem;
  open: boolean;
  /** the item has validation messages the guide has not fixed yet */
  needsAttention: boolean;
  onToggle: () => void;
  /** the full editing form, rendered under the row while it is open */
  children: ReactNode;
}

/** One summarised item (name and date). Clicking it opens its form inline. */
export function ItemSummaryRow({ item, open, needsAttention, onToggle, children }: Props) {
  const panelId = useId();
  return (
    <li className={`summary-item${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="summary-row"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className={`badge badge-${item.kind.toLowerCase()}`}>{SHORT_KIND[item.kind]}</span>
        <span className="summary-name">
          {item.name || `Untitled ${KIND_LABEL[item.kind].toLowerCase()}`}
        </span>
        {needsAttention && <span className="summary-issue">Needs attention</span>}
        <span className="summary-date">{dateLabel(item)}</span>
      </button>
      {open && (
        <div id={panelId} className="summary-panel">
          {children}
        </div>
      )}
    </li>
  );
}
