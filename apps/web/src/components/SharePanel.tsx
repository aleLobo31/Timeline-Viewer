import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { MaterialSummaryDto, ShareMethod } from '@timeline-viewer/shared';
import { useShare, useUnshare, type ShareResult } from '../api/materials';

export const shareUrl = (path: string) => `${window.location.origin}${path}`;

interface Props {
  materials: Pick<MaterialSummaryDto, 'id' | 'name'>[];
  onClose: () => void;
}

/** US-F1.5: choose how the selected timelines are shared (link or QR code). */
export function SharePanel({ materials, onClose }: Props) {
  const share = useShare();
  const unshare = useUnshare();
  const [method, setMethod] = useState<ShareMethod>('LINK');
  const [results, setResults] = useState<ShareResult[]>([]);
  const [stopped, setStopped] = useState<Set<string>>(new Set());

  const names = new Map(materials.map((m) => [m.id, m.name]));

  const onShare = () => {
    share.mutate(
      { materialIds: materials.map((m) => m.id), method },
      {
        onSuccess: (r) => {
          setResults(r);
          setStopped(new Set());
        },
      },
    );
  };

  return (
    <section className="card share-panel" aria-label="Share timelines">
      <div className="page-head">
        <h2>Share {materials.length === 1 ? 'timeline' : `${materials.length} timelines`}</h2>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onClose}
          aria-label="Close sharing"
        >
          {'\u2715'}
        </button>
      </div>
      <p>
        Tourists who open the link or scan the code can view and interact with the timeline. Nothing
        else is visible to them.
      </p>

      <fieldset className="choice-group">
        <legend className="label">How do you want to share?</legend>
        <div className="btn-row">
          {(['LINK', 'QR'] as const).map((m) => (
            <label key={m} className={`radio-pill${method === m ? ' is-checked' : ''}`}>
              <input
                type="radio"
                name="share-method"
                className="sr-only"
                checked={method === m}
                onChange={() => setMethod(m)}
              />
              {m === 'LINK' ? 'Link' : 'QR code'}
            </label>
          ))}
        </div>
      </fieldset>

      {share.error && (
        <div className="alert alert-error" role="alert">
          {share.error.message}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        onClick={onShare}
        disabled={share.isPending}
      >
        {share.isPending ? 'Sharing...' : 'Share'}
      </button>

      {results.length > 0 && (
        <ul className="share-results" aria-label="Shared timelines">
          {results.map(({ materialId, share: s }) => (
            <li key={materialId} className="share-result">
              <h3>{names.get(materialId) ?? 'Timeline'}</h3>
              {stopped.has(materialId) ? (
                <p className="tl-muted">
                  Sharing stopped. Tourists can no longer see this timeline.
                </p>
              ) : (
                <>
                  {s.method === 'LINK' ? (
                    <LinkShare url={shareUrl(s.path)} />
                  ) : (
                    <QrShare url={shareUrl(s.path)} name={names.get(materialId) ?? 'timeline'} />
                  )}
                  <button
                    type="button"
                    className="btn"
                    disabled={unshare.isPending}
                    onClick={() =>
                      unshare.mutate(materialId, {
                        onSuccess: () => setStopped((cur) => new Set(cur).add(materialId)),
                      })
                    }
                  >
                    Stop sharing
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LinkShare({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="link-share">
      <input
        type="text"
        readOnly
        value={url}
        aria-label="Share link"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" className="btn" onClick={copy}>
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}

function QrShare({ url, name }: { url: string; name: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: 'M' })
      .then((d) => !cancelled && setDataUrl(d))
      .catch(() => !cancelled && setDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!dataUrl) return <p className="spinner-text">Generating QR code...</p>;
  return (
    <div className="qr-share">
      <img src={dataUrl} width={200} height={200} alt={`QR code that opens ${name}`} />
      <a className="btn" href={dataUrl} download={`${name.replace(/[^\w-]+/g, '-')}-qr.png`}>
        Download QR
      </a>
      <p className="hint">{url}</p>
    </div>
  );
}
