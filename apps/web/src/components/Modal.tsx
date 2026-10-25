import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

interface Props {
  title: string;
  /** accessible name of the dialog; the title when omitted */
  label?: string;
  closeLabel?: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Centered dialog over a blurred backdrop. Escape, the close button and a click outside close it;
 * the focus moves into it and goes back to the element that opened it.
 */
export function Modal({
  title,
  label = title,
  closeLabel = 'Close',
  onClose,
  className = '',
  children,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // read while rendering, before an autoFocus control inside takes the focus
  const [opener] = useState(() => document.activeElement as HTMLElement | null);

  useEffect(() => {
    const dialog = dialogRef.current;
    // a control inside may have taken the focus already (autoFocus)
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
    return () => opener?.focus();
  }, [opener]);

  const handleKeyDown = (e: KeyboardEvent) => {
    // keys typed inside the dialog never reach the page behind it
    e.stopPropagation();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={`modal card ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="page-head">
          <h2>{title}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label={closeLabel}>
            {'\u2715'}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
