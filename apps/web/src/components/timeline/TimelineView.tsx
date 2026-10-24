import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import {
  EVENT_ICON_GLYPHS,
  EVENT_ICON_LABELS,
  colorHex,
  type YearRange,
} from '@timeline-viewer/shared';
import {
  EVENT_W,
  ZONE_GAP,
  formatEventDate,
  formatRange,
  formatYear,
  layoutTimeline,
  type BarLayout,
  type EventEntry,
  type Item,
} from './layout';

const MIN_CANVAS_WIDTH = 640;

interface Props {
  items: readonly Item[];
  /** Visible years; the whole timeline when omitted (tourist subset, US-F1.6) */
  window?: YearRange | null;
  /** accessible name of the region */
  label?: string;
  /** lets a parent (e.g. the phone preview) scroll the viewport with its own buttons */
  scrollRef?: RefObject<HTMLDivElement>;
}

/** Measures the width of an element (falls back to a fixed width without ResizeObserver, e.g. jsdom). */
function useWidth<T extends HTMLElement>(ref: RefObject<T>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/**
 * US-F1.2 to US-F1.4: periods above processes above the axis; events are points
 * on the axis (year + icon + name). Selecting any element drops down its details.
 */
export function TimelineView({ items, window = null, label = 'Timeline', scrollRef }: Props) {
  const ownRef = useRef<HTMLDivElement>(null);
  const viewportRef = scrollRef ?? ownRef;
  const containerWidth = useWidth(viewportRef);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const width = Math.max(containerWidth || MIN_CANVAS_WIDTH, MIN_CANVAS_WIDTH);
  const layout = useMemo(() => layoutTimeline(items, window, width), [items, window, width]);

  const selected = useMemo(() => {
    const all = [
      ...layout.periods.map((b) => b.item),
      ...layout.processes.map((b) => b.item),
      ...layout.events.map((e) => e.item),
    ];
    return all.find((i) => i.id === selectedId) ?? null;
  }, [layout, selectedId]);

  // The selection is cleared when its element is cut out of the view.
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  const toggle = (id: string) => setSelectedId((cur) => (cur === id ? null : id));
  const zonePeriodsTop = 0;
  const zoneProcessesTop = layout.periodsHeight + (layout.periodsHeight ? ZONE_GAP : 0);

  return (
    <section className="tl" aria-label={label}>
      <div
        className="tl-scroll"
        ref={viewportRef}
        tabIndex={0}
        aria-label={`${label}, scroll sideways to see more`}
      >
        <div
          className="tl-canvas"
          style={{ width, height: layout.height }}
          data-testid="timeline-canvas"
        >
          {layout.periods.map((bar) => (
            <Bar
              key={bar.item.id}
              bar={bar}
              top={zonePeriodsTop + bar.top}
              selected={selectedId === bar.item.id}
              onClick={() => toggle(bar.item.id)}
            />
          ))}
          {layout.processes.map((bar) => (
            <Bar
              key={bar.item.id}
              bar={bar}
              top={zoneProcessesTop + bar.top}
              selected={selectedId === bar.item.id}
              onClick={() => toggle(bar.item.id)}
            />
          ))}

          <div className="tl-axis" style={{ top: layout.axisY }} aria-hidden="true" />
          {layout.ticks.map((t) => (
            <div
              key={t.year}
              className="tl-tick"
              style={{ left: t.x, top: layout.axisY }}
              aria-hidden="true"
            >
              <span>{formatYear(t.year)}</span>
            </div>
          ))}

          {layout.events.map(({ item, x, offset }) => (
            <EventPoint
              key={item.id}
              event={item}
              x={x}
              axisY={layout.axisY}
              offset={offset}
              selected={selectedId === item.id}
              onClick={() => toggle(item.id)}
            />
          ))}
        </div>
      </div>

      {selected && <Details item={selected} onClose={() => setSelectedId(null)} />}
    </section>
  );
}

function Bar({
  bar,
  top,
  selected,
  onClick,
}: {
  bar: BarLayout;
  top: number;
  selected: boolean;
  onClick: () => void;
}) {
  const { item } = bar;
  const kind = item.kind === 'PERIOD' ? 'Period' : 'Process';
  return (
    <button
      type="button"
      className={`tl-bar tl-bar-${item.kind.toLowerCase()}${selected ? ' is-selected' : ''}${bar.clippedStart ? ' clip-start' : ''}${bar.clippedEnd ? ' clip-end' : ''}`}
      style={
        {
          left: bar.left,
          width: bar.width,
          top,
          '--bar-color': colorHex(item.color),
        } as CSSProperties
      }
      aria-expanded={selected}
      aria-label={`${kind}: ${item.name}, ${formatRange(item.startYear, item.endYear)}`}
      title={`${item.name} (${formatRange(item.startYear, item.endYear)})`}
      onClick={onClick}
    >
      <span className="tl-bar-name">{item.name}</span>
    </button>
  );
}

function EventPoint({
  event,
  x,
  axisY,
  offset,
  selected,
  onClick,
}: {
  event: EventEntry;
  x: number;
  axisY: number;
  offset: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <>
      <div className="tl-dot" style={{ left: x, top: axisY }} aria-hidden="true" />
      <div className="tl-stem" style={{ left: x, top: axisY, height: offset }} aria-hidden="true" />
      <button
        type="button"
        className={`tl-event${selected ? ' is-selected' : ''}`}
        style={{ left: x - EVENT_W / 2, top: axisY + offset, width: EVENT_W }}
        aria-expanded={selected}
        aria-label={`Event: ${event.name}, ${formatEventDate(event)}`}
        onClick={onClick}
      >
        {event.icon && (
          <span className="tl-event-icon" aria-hidden="true">
            {EVENT_ICON_GLYPHS[event.icon]}
          </span>
        )}
        <span className="tl-event-year">{formatYear(event.year)}</span>
        <span className="tl-event-name">{event.name}</span>
      </button>
    </>
  );
}

function Details({ item, onClose }: { item: Item; onClose: () => void }) {
  return (
    <article className="tl-details card" aria-live="polite" data-testid="timeline-details">
      <div className="tl-details-head">
        <div>
          <h3>
            {item.kind === 'EVENT' && item.icon && (
              <span aria-hidden="true">{EVENT_ICON_GLYPHS[item.icon]} </span>
            )}
            {item.name}
          </h3>
          <p className="tl-details-meta">
            {item.kind === 'EVENT'
              ? `${item.icon ? `${EVENT_ICON_LABELS[item.icon]} \u00b7 ` : ''}${formatEventDate(item)}`
              : `${item.kind === 'PERIOD' ? 'Period' : 'Process'} \u00b7 ${formatRange(item.startYear, item.endYear)}`}
          </p>
        </div>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={onClose}
          aria-label="Close details"
        >
          {'\u2715'}
        </button>
      </div>
      {item.description ? (
        <p className="tl-details-text">{item.description}</p>
      ) : (
        <p className="tl-details-text tl-muted">No description.</p>
      )}
      {item.kind === 'EVENT' && item.imageUrl && (
        <img
          className="tl-details-img"
          src={item.imageUrl}
          alt={`Illustration of ${item.name}`}
          loading="lazy"
        />
      )}
    </article>
  );
}
