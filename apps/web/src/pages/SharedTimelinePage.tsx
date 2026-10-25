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
import { MenuIcon } from '../components/icons';
import { Modal } from '../components/Modal';
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
  const [menuOpen, setMenuOpen] = useState(false);

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

  const handleApply = (e: FormEvent) => {
    e.preventDefault();
    setMenuOpen(false);
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

  const handleShowAll = () => {
    setError(null);
    setMenuOpen(false);
    show(null);
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
      <div className="viewer-head">
        <h1>{name}</h1>
        <button
          type="button"
          className="btn btn-icon"
          aria-label="Timeframe menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon />
        </button>
      </div>
      {menuOpen && (
        <Modal
          title="Timeframe"
          closeLabel="Close timeframe"
          className="modal-compact"
          onClose={() => setMenuOpen(false)}
        >
          <form onSubmit={handleApply} noValidate aria-label="Choose a timeframe">
            <div className="timeframe-fields">
              <Field label="From year">
                <input
                  type="number"
                  inputMode="numeric"
                  value={from}
                  autoFocus
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
            </div>
            <div className="btn-row btn-row-center">
              <button type="submit" className="btn btn-primary">
                Show timeframe
              </button>
              <button type="button" className="btn" disabled={!window} onClick={handleShowAll}>
                Show all
              </button>
            </div>
          </form>
        </Modal>
      )}
      <p>{description}</p>

      {error && (
        <div className="alert alert-error" role="alert">
          {error} Showing the whole timeline instead.
        </div>
      )}

      <span className="sr-only" aria-live="polite" data-testid="viewer-range">
        {formatRange(current.from, current.to)}
      </span>

      <TimelineView items={items} window={window} label={name} />
    </main>
  );
}
