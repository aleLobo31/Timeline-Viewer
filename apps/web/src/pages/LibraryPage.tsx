import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  MATERIAL_TYPES,
  MATERIAL_TYPE_LABELS,
  type MaterialSummaryDto,
  type MaterialType,
} from '@timeline-viewer/shared';
import { useMaterials } from '../api/materials';
import { SharePanel } from '../components/SharePanel';

const FILTER_LABEL: Record<MaterialType, string> = {
  TIMELINE: 'Timelines',
  FAMILY_TREE: 'Family trees',
  MAP: 'Maps',
};

export function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const typeParam = params.get('type');
  const type = MATERIAL_TYPES.find((t) => t === typeParam);
  const { data: materials, isLoading, error } = useMaterials(type);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);

  const setType = (t?: MaterialType) => setParams(t ? { type: t } : {});
  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const selectedMaterials = (materials ?? []).filter((m) => selected.has(m.id));

  return (
    <main className="page page-wide">
      <div className="page-head">
        <h1>My library</h1>
        <button
          type="button"
          className="btn btn-primary"
          disabled={selectedMaterials.length === 0}
          onClick={() => setSharing(true)}
        >
          Share selected{selectedMaterials.length > 0 ? ` (${selectedMaterials.length})` : ''}
        </button>
      </div>

      <div className="btn-row filters" role="group" aria-label="Filter by type">
        <button type="button" className="btn" aria-pressed={!type} onClick={() => setType()}>
          All
        </button>
        {MATERIAL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="btn"
            aria-pressed={type === t}
            onClick={() => setType(t)}
          >
            {FILTER_LABEL[t]}
          </button>
        ))}
      </div>

      {sharing && selectedMaterials.length > 0 && (
        <SharePanel materials={selectedMaterials} onClose={() => setSharing(false)} />
      )}

      {isLoading && <p className="spinner-text">Loading your library...</p>}
      {error && (
        <div className="alert alert-error" role="alert">
          {error.message}
        </div>
      )}

      {!isLoading && !error && (
        <ul className="material-grid" aria-label="Materials">
          <li>
            <NewMaterialCard />
          </li>
          {(materials ?? []).map((m) => (
            <li key={m.id}>
              <MaterialCard
                material={m}
                selected={selected.has(m.id)}
                onToggle={() => toggle(m.id)}
              />
            </li>
          ))}
        </ul>
      )}
      {!isLoading && !error && materials?.length === 0 && (
        <p className="tl-muted">
          {type
            ? `You have no ${FILTER_LABEL[type].toLowerCase()} yet.`
            : 'Your library is empty. Create your first material with the + box.'}
        </p>
      )}
    </main>
  );
}

function NewMaterialCard() {
  const [picking, setPicking] = useState(false);
  if (!picking) {
    return (
      <button
        type="button"
        className="material-card material-new"
        onClick={() => setPicking(true)}
        aria-label="Create new material"
      >
        <span className="plus" aria-hidden="true">
          +
        </span>
        <span>New</span>
      </button>
    );
  }
  return (
    <div
      className="material-card material-new picking"
      role="group"
      aria-label="Choose the type of material"
    >
      <Link className="btn btn-primary" to="/timelines/new">
        Timeline
      </Link>
      <button type="button" className="btn" disabled>
        Family tree (soon)
      </button>
      <button type="button" className="btn" disabled>
        Map (soon)
      </button>
      <button type="button" className="btn btn-ghost" onClick={() => setPicking(false)}>
        Cancel
      </button>
    </div>
  );
}

function MaterialCard({
  material,
  selected,
  onToggle,
}: {
  material: MaterialSummaryDto;
  selected: boolean;
  onToggle: () => void;
}) {
  // Without an explicit cover the card stays blank: it is never filled from the items.
  const body = (
    <>
      <span className="cover">
        {material.coverImage && <img src={material.coverImage} alt="" loading="lazy" />}
      </span>
      <span className="material-name">{material.name}</span>
    </>
  );
  return (
    <article
      className={`material-card${selected ? ' is-selected' : ''}`}
      aria-label={material.name}
    >
      {material.type === 'TIMELINE' ? (
        <Link to={`/timelines/${material.id}`} className="material-link">
          {body}
        </Link>
      ) : (
        <div className="material-link">{body}</div>
      )}
      <div className="material-meta">
        <span className="badge">{MATERIAL_TYPE_LABELS[material.type]}</span>
        {material.shared && <span className="badge badge-shared">Shared</span>}
        <label className="select-box">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${material.name}`}
          />
          <span>Select</span>
        </label>
      </div>
    </article>
  );
}
