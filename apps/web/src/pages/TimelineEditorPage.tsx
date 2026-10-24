import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  eventsNeedingExactDate,
  issuesByPath,
  validItems,
  validateTimeline,
  type ItemKind,
  type ValidationIssue,
} from '@timeline-viewer/shared';
import { ApiError } from '../api/client';
import { useDeleteTimeline, useSaveTimeline, useTimeline } from '../api/materials';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { PhonePreview } from '../components/PhonePreview';
import { ArrowIcon } from '../components/icons';
import { scrollStep } from '../components/scroll';
import type { Item } from '../components/timeline/layout';
import {
  KIND_LABEL,
  draftFromDto,
  draftToPayload,
  emptyDraft,
  emptyItem,
  sortForList,
  type Draft,
  type DraftItem,
} from '../editor/draft';
import { HeaderRow } from '../editor/HeaderRow';
import { ItemCard } from '../editor/ItemCard';
import { ItemSummaryRow } from '../editor/ItemSummaryRow';

export function TimelineEditorPage() {
  const { id } = useParams();
  const query = useTimeline(id);

  if (!id) return <EditorForm key="new" />;
  if (query.isLoading) return <p className="page spinner-text">Loading timeline...</p>;
  if (query.error || !query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <main className="page">
        <h1>Timeline not found</h1>
        <p>
          {notFound
            ? 'This timeline does not exist or it was not created by you, so you cannot edit it.'
            : 'The timeline could not be loaded.'}
        </p>
        <Link className="btn" to="/library">
          Back to library
        </Link>
      </main>
    );
  }
  return <EditorForm key={query.data.id} id={query.data.id} initial={draftFromDto(query.data)} />;
}

/** The item whose form is open, with the list position it had when it was opened. */
interface OpenItem {
  key: string;
  index: number;
}

function EditorForm({ id, initial }: { id?: string; initial?: Draft }) {
  const navigate = useNavigate();
  const location = useLocation();
  const save = useSaveTimeline(id);
  const remove = useDeleteTimeline(id ?? '');
  const [draft, setDraft] = useState<Draft>(() => initial ?? emptyDraft());
  const [showErrors, setShowErrors] = useState(false);
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(
    (location.state as { saved?: boolean } | null)?.saved ? 'Timeline saved.' : null,
  );
  const [open, setOpen] = useState<OpenItem | null>(null);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const payload = useMemo(() => draftToPayload(draft), [draft]);
  const validation = useMemo(() => validateTimeline(payload), [payload]);
  const issues = useMemo(
    () => (validation.ok ? [] : validation.issues).concat(serverIssues),
    [validation, serverIssues],
  );
  const byPath = useMemo(() => issuesByPath(issues), [issues]);
  const needsDate = useMemo(() => eventsNeedingExactDate(payload.items), [payload]);
  const previewItems = useMemo(() => validItems(payload.items) as Item[], [payload]);
  const listEntries = useMemo(() => sortForList(draft.items, open), [draft.items, open]);

  const edit = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaveMessage(null);
    setServerIssues([]);
  };
  const editItem = (key: string, patch: Partial<DraftItem>) =>
    edit({ items: draft.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) });

  const addItem = (kind: ItemKind) => {
    const item = emptyItem(kind);
    setFreshKey(item.key);
    setOpen({ key: item.key, index: 0 });
    edit({ items: [...draft.items, item] });
  };

  const removeItem = (key: string) => {
    setOpen(null);
    edit({ items: draft.items.filter((i) => i.key !== key) });
  };

  const toggleItem = (key: string) => {
    if (open?.key === key) return setOpen(null);
    setFreshKey(null);
    setOpen({ key, index: listEntries.findIndex((e) => e.item.key === key) });
  };

  const errorsAt = (path: string, always = false) =>
    showErrors || always ? (byPath.get(path) ?? []) : [];

  const hasIssuesAt = (index: number) =>
    showErrors && issues.some((i) => i.path[0] === 'items' && i.path[1] === index);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    if (!validation.ok) {
      setShowErrors(true);
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setServerIssues([]);
    save.mutate(payload, {
      onSuccess: (timeline) => {
        setShowErrors(false);
        if (!id) navigate(`/timelines/${timeline.id}`, { replace: true, state: { saved: true } });
        else setSaveMessage('Timeline saved.');
      },
      onError: (err) => {
        if (err instanceof ApiError && err.issues.length) {
          setServerIssues(err.issues);
          setShowErrors(true);
        }
      },
    });
  };

  const summary = showErrors && issues.length > 0 ? issues : [];
  const describe = (issue: ValidationIssue) => {
    const [scope, index] = issue.path;
    if (scope === 'items' && typeof index === 'number' && draft.items[index]) {
      return `${KIND_LABEL[draft.items[index].kind]} ${index + 1}: ${issue.message}`;
    }
    return issue.message;
  };

  const requestError =
    save.error && !(save.error instanceof ApiError && save.error.issues.length)
      ? save.error.message
      : null;

  return (
    <main className="editor-page">
      <form className="editor-layout" onSubmit={onSubmit} noValidate aria-label="Timeline editor">
        <section className="editor-zone" aria-label="Editing">
          <div className="editor-topbar">
            <Breadcrumbs
              crumbs={[
                { label: 'Library', to: '/library' },
                { label: 'Timelines', to: '/library?type=TIMELINE' },
                { label: draft.name.trim() || (id ? 'Untitled timeline' : 'New timeline') },
              ]}
            />
            <h1 className="sr-only">{id ? 'Edit timeline' : 'New timeline'}</h1>
          </div>

          <HeaderRow draft={draft} errors={errorsAt} onChange={edit} />

          <div className="editor-items-bar">
            <h2>Historical items</h2>
            <div className="btn-row" role="group" aria-label="Add item">
              <button type="button" className="btn" onClick={() => addItem('EVENT')}>
                + Add event
              </button>
              <button type="button" className="btn" onClick={() => addItem('PROCESS')}>
                + Add process
              </button>
              <button type="button" className="btn" onClick={() => addItem('PERIOD')}>
                + Add period
              </button>
            </div>
            <div className="btn-row" role="group" aria-label="Scroll the items">
              <button
                type="button"
                className="btn btn-icon"
                aria-label="Scroll items up"
                onClick={() => scrollStep(listRef.current, 'up')}
              >
                <ArrowIcon direction="up" />
              </button>
              <button
                type="button"
                className="btn btn-icon"
                aria-label="Scroll items down"
                onClick={() => scrollStep(listRef.current, 'down')}
              >
                <ArrowIcon direction="down" />
              </button>
            </div>
          </div>

          <div className="item-scroll" ref={listRef} tabIndex={-1}>
            {summary.length > 0 && (
              <div className="alert alert-error" role="alert" tabIndex={-1} ref={summaryRef}>
                <strong>The timeline cannot be saved yet. Please fix the following:</strong>
                <ul>
                  {summary.map((issue, i) => (
                    <li key={i}>{describe(issue)}</li>
                  ))}
                </ul>
              </div>
            )}
            {errorsAt('items').length > 0 && (
              <div className="field-error" role="alert">
                {errorsAt('items').map((m) => (
                  <div key={m}>{m}</div>
                ))}
              </div>
            )}
            {draft.items.length === 0 && (
              <p className="tl-muted">Add at least one historical event, process or period.</p>
            )}
            <ul className="summary-list" aria-label="Historical items">
              {listEntries.map(({ item, index }) => (
                <ItemSummaryRow
                  key={item.key}
                  item={item}
                  open={open?.key === item.key}
                  needsAttention={hasIssuesAt(index)}
                  onToggle={() => toggleItem(item.key)}
                >
                  <ItemCard
                    index={index}
                    item={item}
                    needsExactDate={needsDate.has(index)}
                    autoFocus={item.key === freshKey}
                    errors={(field) =>
                      errorsAt(`items.${index}.${field}`, field === 'day' || field === 'month')
                    }
                    onChange={(patch) => editItem(item.key, patch)}
                    onRemove={() => removeItem(item.key)}
                  />
                </ItemSummaryRow>
              ))}
            </ul>
          </div>

          {id && confirmingDelete && (
            <div className="alert alert-error" role="alertdialog" aria-label="Confirm delete">
              <p>
                <strong>Delete this whole timeline?</strong> This cannot be undone and tourists with
                its link or QR will no longer see it.
              </p>
              {remove.error && <p>{remove.error.message}</p>}
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate(undefined, {
                      onSuccess: () => navigate('/library', { replace: true }),
                    })
                  }
                >
                  {remove.isPending ? 'Deleting...' : 'Yes, delete timeline'}
                </button>
                <button type="button" className="btn" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="editor-actions">
            <button className="btn btn-primary" type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving...' : 'Save timeline'}
            </button>
            {id && !confirmingDelete && (
              <button type="button" className="btn" onClick={() => setConfirmingDelete(true)}>
                Delete timeline
              </button>
            )}
            {saveMessage && (
              <div className="alert alert-ok" role="status">
                {saveMessage}
              </div>
            )}
            {requestError && (
              <div className="alert alert-error" role="alert">
                {requestError}
              </div>
            )}
          </div>
        </section>

        <aside className="editor-preview" aria-label="Preview">
          <PhonePreview title={draft.name} items={previewItems} />
        </aside>
      </form>
    </main>
  );
}
