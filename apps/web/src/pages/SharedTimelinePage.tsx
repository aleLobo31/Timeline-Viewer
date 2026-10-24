import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  canPan,
  panWindow,
  timelineRange,
  validateTimeframe,
  type YearRange,
} from '@timeline-viewer/shared';
import { ApiError } from '../api/client';
import { usePublicTimeline } from '../api/materials';
import { Field } from '../components/Field';
import { TimelineView } from '../components/timeline/TimelineView';
import { formatRange, type Item } from '../components/timeline/layout';

/** Public, read-only viewer opened through a shared link or QR code (US-F1.6). */
export function SharedTimelinePage() {
  const { token } = useParams();
  const { data: timeline, isLoading, error } = usePublicTimeline(token);

  if (isLoading) return <p className="page spinner-text">Loading timeline...</p>;
  if (error || !timeline) {
    const gone = error instanceof ApiError && error.status === 404;
    return (
      <main className="page">
        <h1>Timeline not available</h1>
        <p>
          {gone
            ? 'This timeline does not exist or the guide has stopped sharing it. Ask your guide for a new link or QR code.'
            : (error?.message ?? 'The timeline could not be loaded.')}
        </p>
      </main>
    );
  }
  return (
    <Viewer
      name={timeline.name}
      description={timeline.description}
      items={timeline.items as Item[]}
    />
  );
}

function Viewer({
  name,
  description,
  items,
}: {
  name: string;
  description: string;
  items: Item[];
}) {
  const full = useMemo(() => timelineRange(items), [items]);
  const [window, setWindow] = useState<YearRange | null>(null);
  const [from, setFrom] = useState(full ? String(full.from) : '');
  const [to, setTo] = useState(full ? String(full.to) : '');
  const [error, setError] = useState<string | null>(null);

  if (!full)
    return (
      <main className="page">
        <h1>{name}</h1>
        <p>This timeline is empty.</p>
      </main>
    );

  const current = window ?? full;
  const can = window ? canPan(full, window) : { left: false, right: false };

  const show = (w: YearRange | null) => {
    setWindow(w);
    setFrom(String((w ?? full).from));
    setTo(String((w ?? full).to));
  };

  const onApply = (e: FormEvent) => {
    e.preventDefault();
    const result = validateTimeframe(full, Number(from), Number(to));
    if (!result.ok) {
      // Wrong timeframe: warn and go back to the default (whole) timeline.
      setError(result.message);
      show(null);
      return;
    }
    setError(null);
    show(result.window.from === full.from && result.window.to === full.to ? null : result.window);
  };

  const move = (direction: 'left' | 'right') => {
    if (!window || !can[direction]) return;
    setError(null);
    show(panWindow(full, window, direction));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'ArrowLeft') move('left');
    if (e.key === 'ArrowRight') move('right');
  };

  return (
    <main className="page" onKeyDown={onKeyDown}>
      <h1>{name}</h1>
      <p>{description}</p>

      <form
        className="viewer-controls"
        onSubmit={onApply}
        noValidate
        aria-label="Choose a timeframe"
      >
        <Field label="From year">
          <input
            type="number"
            inputMode="numeric"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="To year">
          <input
            type="number"
            inputMode="numeric"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
        <div className="btn-row" style={{ marginBottom: '0.9rem' }}>
          <button type="submit" className="btn btn-primary">
            Show timeframe
          </button>
          <button
            type="button"
            className="btn"
            disabled={!window}
            onClick={() => {
              setError(null);
              show(null);
            }}
          >
            Show all
          </button>
        </div>
      </form>

      {error && (
        <div className="alert alert-error" role="alert">
          {error} Showing the whole timeline instead.
        </div>
      )}

      <div className="viewer-nav">
        <button
          type="button"
          className="btn"
          disabled={!can.left}
          onClick={() => move('left')}
          aria-label="Move to earlier years"
        >
          &larr; Earlier
        </button>
        <span className="viewer-range" aria-live="polite" data-testid="viewer-range">
          {formatRange(current.from, current.to)}
        </span>
        <button
          type="button"
          className="btn"
          disabled={!can.right}
          onClick={() => move('right')}
          aria-label="Move to later years"
        >
          Later &rarr;
        </button>
      </div>
      {!window && (
        <p className="tl-muted">
          The whole timeline is shown ({formatRange(full.from, full.to)}). Choose a timeframe to
          zoom in and then move along it.
        </p>
      )}

      <TimelineView items={items} window={window} label={name} />
    </main>
  );
}
