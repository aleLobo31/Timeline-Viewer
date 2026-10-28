import { useId, type ReactElement, type ReactNode, cloneElement } from 'react';

/**
 * Icon-only control placed in a form row. It has no visible label (its own aria-label names it),
 * but keeps the height of one so it lines up with the labelled inputs beside it.
 */
export const BareField = ({ children }: { children: ReactNode }) => (
  <div className="field field-compact">
    <span className="label label-spacer" aria-hidden="true">
      {'\u00a0'}
    </span>
    {children}
  </div>
);

interface FieldProps {
  label: string;
  optional?: boolean;
  hint?: string;
  errors?: string[];
  /** a single input / select / textarea element; id and aria props are injected */
  children: ReactElement<Record<string, unknown>>;
}

/** Label + control + inline errors, wired with the right aria attributes. */
export function Field({ label, optional, hint, errors = [], children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [
    children.props['aria-describedby'] as string | undefined,
    errors.length ? errorId : '',
    hint ? hintId : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {optional && <span className="optional">(optional)</span>}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': errors.length > 0 || undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <span className="hint" id={hintId}>
          {hint}
        </span>
      )}
      {errors.length > 0 && (
        <div className="field-error" id={errorId} role="alert">
          {errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}
    </div>
  );
}
