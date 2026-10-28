import QRCode from 'qrcode';
import { useEffect, useState, type ReactNode } from 'react';
import type { MaterialSummaryDto, ShareMethod } from '@timeline-viewer/shared';
import { useShare, useUnshare, type ShareResult } from '../api/materials';
import { Modal } from './Modal';

export const shareUrl = (path: string) => `${window.location.origin}${path}`;

interface Props {
  material: Pick<MaterialSummaryDto, 'id' | 'name'>;
  onClose: () => void;
}

/** US-F1.5: modal where the guide chooses how one timeline is shared (link or QR code). */
export function SharePanel({ material, onClose }: Props) {
  const share = useShare();
  const unshare = useUnshare();
  const [method, setMethod] = useState<ShareMethod>('LINK');
  const [result, setResult] = useState<ShareResult | null>(null);
  const [stopped, setStopped] = useState(false);

  const handleShare = () => {
    share.mutate(
      { materialIds: [material.id], method },
      {
        onSuccess: (shares) => {
          setResult(shares[0] ?? null);
          setStopped(false);
        },
      },
    );
  };

  const handleStopSharing = () => {
    unshare.mutate(material.id, { onSuccess: () => setStopped(true) });
  };

  const stopButton = (
    <button type="button" className="btn" disabled={unshare.isPending} onClick={handleStopSharing}>
      Stop sharing
    </button>
  );

  return (
    <Modal
      title="Share timeline"
      label={`Share ${material.name}`}
      closeLabel="Close sharing"
      onClose={onClose}
    >
      <p>
        Tourists who open the link or scan the code can view and interact with{' '}
        <strong>{material.name}</strong>. Nothing else is visible to them.
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
        onClick={handleShare}
        disabled={share.isPending}
      >
        {share.isPending ? 'Sharing...' : 'Share'}
      </button>

      {result && (
        <div className="share-result" aria-label="Shared timeline">
          {stopped ? (
            <p className="tl-muted">Sharing stopped. Tourists can no longer see this timeline.</p>
          ) : (
            <>
              {result.share.method === 'LINK' ? (
                <>
                  <LinkShare url={shareUrl(result.share.path)} />
                  {stopButton}
                </>
              ) : (
                <QrShare url={shareUrl(result.share.path)} name={material.name}>
                  {stopButton}
                </QrShare>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
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

/** The QR code and, on one centered row, its download button and the given actions. */
function QrShare({ url, name, children }: { url: string; name: string; children: ReactNode }) {
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

  return (
    <div className="qr-share">
      {dataUrl ? (
        <img src={dataUrl} width={200} height={200} alt={`QR code that opens ${name}`} />
      ) : (
        <p className="spinner-text">Generating QR code...</p>
      )}
      <div className="btn-row">
        {dataUrl && (
          <a className="btn" href={dataUrl} download={`${name.replace(/[^\w-]+/g, '-')}-qr.png`}>
            Download QR
          </a>
        )}
        {children}
      </div>
    </div>
  );
}
