import { useId, useState, type ReactNode } from 'react';
import {
  COLOR_PALETTE,
  EVENT_ICONS,
  EVENT_ICON_GLYPHS,
  EVENT_ICON_LABELS,
  ITEM_DESCRIPTION_MAX_WORDS,
  countWords,
} from '@timeline-viewer/shared';
import { Field } from '../components/Field';
import { FieldErrors } from '../components/FieldErrors';
import { KIND_LABEL, type DraftItem } from './draft';
import { ImageUploadButton } from './ImageUploadButton';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface Props {
  index: number;
  item: DraftItem;
  /** messages of a field of this item (empty when not shown yet) */
  errors: (field: string) => string[];
  /** another event shares this year, so day and month are mandatory (US-F1.2) */
  needsExactDate: boolean;
  autoFocus: boolean;
  onChange: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
}

type Picker = 'icon' | 'color' | null;

/** Full form of one historical event, process or period. */
export function ItemCard({
  index,
  item,
  errors,
  needsExactDate,
  autoFocus,
  onChange,
  onRemove,
}: Props) {
  const label = KIND_LABEL[item.kind];
  const n = index + 1;
  const isEvent = item.kind === 'EVENT';
  const words = countWords(item.description);
  const [picker, setPicker] = useState<Picker>(null);
  const panelId = useId();
  const toggle = (which: Exclude<Picker, null>) =>
    setPicker((cur) => (cur === which ? null : which));
  const color = COLOR_PALETTE.find((c) => c.key === item.color);

  return (
    <fieldset className="item-card" aria-label={`${label} ${n}`}>
      <div className={`item-grid ${isEvent ? 'item-grid-event' : 'item-grid-range'}`}>
        {isEvent ? (
          <>
            <Field label="Year" errors={errors('year')}>
              <input
                type="number"
                inputMode="numeric"
                value={item.year}
                autoFocus={autoFocus}
                onChange={(e) => onChange({ year: e.target.value })}
              />
            </Field>
            <Field
              label="Day"
              optional={!needsExactDate}
              hint={needsExactDate ? 'Required: another event shares this year.' : undefined}
              errors={errors('day')}
            >
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={item.day}
                onChange={(e) => onChange({ day: e.target.value })}
              />
            </Field>
            <Field label="Month" optional={!needsExactDate} errors={errors('month')}>
              <select value={item.month} onChange={(e) => onChange({ month: e.target.value })}>
                <option value="">-</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <div className="field field-compact">
              <span className="label">Event icon</span>
              <button
                type="button"
                className="btn btn-icon picker-button"
                aria-label={`Event icon: ${item.icon ? EVENT_ICON_LABELS[item.icon] : 'none'}`}
                title="Choose the event icon"
                aria-expanded={picker === 'icon'}
                aria-controls={panelId}
                onClick={() => toggle('icon')}
              >
                <span aria-hidden="true" className="icon-glyph">
                  {item.icon ? EVENT_ICON_GLYPHS[item.icon] : '\u2205'}
                </span>
              </button>
            </div>
            <div className="field field-compact">
              <span className="label">
                Image <span className="optional">(optional)</span>
              </span>
              <ImageUploadButton
                label="event image"
                value={item.imageUrl}
                onChange={(url) => onChange({ imageUrl: url })}
                errors={errors('imageUrl')}
              />
            </div>
          </>
        ) : (
          <>
            <Field label="Start year" errors={errors('startYear')}>
              <input
                type="number"
                inputMode="numeric"
                value={item.startYear}
                autoFocus={autoFocus}
                onChange={(e) => onChange({ startYear: e.target.value })}
              />
            </Field>
            <Field label="End year" errors={errors('endYear')}>
              <input
                type="number"
                inputMode="numeric"
                value={item.endYear}
                onChange={(e) => onChange({ endYear: e.target.value })}
              />
            </Field>
            <div className="field field-compact">
              <span className="label">Color</span>
              <button
                type="button"
                className="btn btn-icon picker-button"
                aria-label={`Color: ${color ? color.label : 'not chosen'}`}
                title="Choose the color"
                aria-expanded={picker === 'color'}
                aria-controls={panelId}
                onClick={() => toggle('color')}
              >
                {color ? (
                  <span
                    className="color-swatch color-swatch-small"
                    style={{ background: color.hex }}
                    aria-hidden="true"
                  />
                ) : (
                  <span aria-hidden="true" className="icon-glyph icon-none">
                    ?
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {picker === 'icon' && isEvent && (
        <fieldset
          id={panelId}
          className="choice-group picker-panel"
          aria-label={`Event icon of ${label} ${n}`}
        >
          <div className="icon-options">
            <IconOption
              name={`icon-${item.key}`}
              value=""
              label="No icon"
              checked={item.icon === ''}
              onSelect={() => onChange({ icon: '' })}
            >
              <span aria-hidden="true" className="icon-glyph icon-none">
                {'\u2205'}
              </span>
            </IconOption>
            {EVENT_ICONS.map((icon) => (
              <IconOption
                key={icon}
                name={`icon-${item.key}`}
                value={icon}
                label={EVENT_ICON_LABELS[icon]}
                checked={item.icon === icon}
                onSelect={() => onChange({ icon })}
              >
                <span aria-hidden="true" className="icon-glyph">
                  {EVENT_ICON_GLYPHS[icon]}
                </span>
              </IconOption>
            ))}
          </div>
        </fieldset>
      )}
      {picker === 'color' && !isEvent && (
        <fieldset
          id={panelId}
          className="choice-group picker-panel"
          aria-label={`Color of ${label} ${n}`}
        >
          <div className="color-options">
            {COLOR_PALETTE.map((c) => (
              <label
                key={c.key}
                className={`color-option${item.color === c.key ? ' is-checked' : ''}`}
                title={c.label}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={`color-${item.key}`}
                  value={c.key}
                  checked={item.color === c.key}
                  onChange={() => onChange({ color: c.key })}
                />
                <span className="color-swatch" style={{ background: c.hex }} aria-hidden="true">
                  {item.color === c.key ? '\u2713' : ''}
                </span>
                <span className="sr-only">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!isEvent && <FieldErrors messages={errors('color')} />}
      {isEvent && <FieldErrors messages={errors('icon')} />}

      <Field
        label={isEvent ? 'Event name' : item.kind === 'PERIOD' ? 'Period name' : 'Process name'}
        errors={errors('name')}
      >
        <input
          type="text"
          value={item.name}
          maxLength={120}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>

      <Field
        label={
          isEvent
            ? 'Event description'
            : item.kind === 'PERIOD'
              ? 'Period description'
              : 'Process description'
        }
        optional={!isEvent}
        hint={`${words}/${ITEM_DESCRIPTION_MAX_WORDS} words`}
        errors={errors('description')}
      >
        <textarea
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>

      <div className="btn-row item-actions">
        <button
          type="button"
          className="btn"
          onClick={onRemove}
          aria-label={`Remove ${label} ${n}`}
        >
          Remove
        </button>
      </div>
    </fieldset>
  );
}

function IconOption({
  name,
  value,
  label,
  checked,
  onSelect,
  children,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <label className={`icon-option${checked ? ' is-checked' : ''}`} title={label}>
      <input
        type="radio"
        className="sr-only"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
      />
      {children}
      <span className="sr-only">{label}</span>
    </label>
  );
}
