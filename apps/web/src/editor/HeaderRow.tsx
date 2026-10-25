import { useId, useState } from 'react';
import { TIMELINE_DESCRIPTION_MAX_CHARS } from '@timeline-viewer/shared';
import { BareField, Field } from '../components/Field';
import { ChevronIcon } from '../components/icons';
import type { Draft } from './draft';
import { ImageUploadButton } from './ImageUploadButton';

interface Props {
  draft: Draft;
  errors: (path: string) => string[];
  onChange: (patch: Partial<Draft>) => void;
}

/** Collapsible data of the timeline: name, short description and the optional cover. */
export function HeaderRow({ draft, errors, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const hasErrors = ['name', 'description', 'coverImage'].some((p) => errors(p).length > 0);

  return (
    <section className="card editor-header" aria-label="Timeline details">
      <button
        type="button"
        className="editor-header-toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((cur) => !cur)}
      >
        <span className="label">Timeline data</span>
        {!open && (
          <span className="editor-header-summary">{draft.name || 'Untitled timeline'}</span>
        )}
        {!open && hasErrors && <span className="summary-issue">Needs attention</span>}
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div id={bodyId} className="editor-header-body">
          <Field label="Timeline name" errors={errors('name')}>
            <input
              type="text"
              maxLength={120}
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </Field>
          <Field
            label="Description"
            hint={`${draft.description.length}/${TIMELINE_DESCRIPTION_MAX_CHARS} characters`}
            errors={errors('description')}
          >
            <input
              type="text"
              maxLength={TIMELINE_DESCRIPTION_MAX_CHARS}
              value={draft.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </Field>
          <BareField>
            <ImageUploadButton
              label="cover image"
              value={draft.coverImage}
              onChange={(url) => onChange({ coverImage: url })}
              errors={errors('coverImage')}
            />
          </BareField>
        </div>
      )}
    </section>
  );
}
