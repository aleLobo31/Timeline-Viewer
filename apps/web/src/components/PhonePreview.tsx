import { useRef } from 'react';
import { ArrowIcon, type Direction } from './icons';
import { scrollStep } from './scroll';
import { TimelineView } from './timeline/TimelineView';
import type { Item } from './timeline/layout';

const BUTTONS: { direction: Direction; label: string }[] = [
  { direction: 'left', label: 'Move timeline left' },
  { direction: 'right', label: 'Move timeline right' },
  { direction: 'up', label: 'Move timeline up' },
  { direction: 'down', label: 'Move timeline down' },
];

interface Props {
  title: string;
  items: readonly Item[];
}

/** Simulation of how a tourist sees the timeline on a phone, with four buttons to move it around. */
export function PhonePreview({ title, items }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);

  return (
    <div className="phone-preview">
      <div className="phone-stage">
        <div className="phone" role="group" aria-label="Phone preview">
          <div className="phone-notch" aria-hidden="true" />
          <div className="phone-screen">
            <p className="phone-title">{title || 'Untitled timeline'}</p>
            {items.length > 0 ? (
              <TimelineView items={items} label="Timeline preview" scrollRef={viewportRef} />
            ) : (
              <p className="phone-empty">Complete an event, process or period to see it here.</p>
            )}
          </div>
        </div>
      </div>
      <div className="phone-controls" role="group" aria-label="Move the preview">
        {BUTTONS.map(({ direction, label }) => (
          <button
            key={direction}
            type="button"
            className="btn btn-icon"
            aria-label={label}
            title={label}
            disabled={items.length === 0}
            onClick={() => scrollStep(viewportRef.current, direction)}
          >
            <ArrowIcon direction={direction} />
          </button>
        ))}
      </div>
    </div>
  );
}
