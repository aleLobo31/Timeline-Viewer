import { FieldErrors } from '../components/FieldErrors';
import { CheckIcon, CloseIcon, ImageIcon } from '../components/icons';
import { useImageUpload } from './useImageUpload';

interface Props {
  /** what the image is, e.g. "cover image": used in the accessible names */
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  errors?: string[];
}

/** Icon-only upload button: no preview, a check mark tells the image is set and a cross removes it. */
export function ImageUploadButton({ label, value, onChange, errors = [] }: Props) {
  const image = useImageUpload((url) => onChange(url));

  return (
    <div className="image-upload">
      <div className="btn-row">
        <label
          className={`btn btn-icon image-button${value ? ' is-set' : ''}`}
          title={value ? `Replace ${label}` : `Upload ${label}`}
        >
          <input
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label={`Upload ${label}`}
            disabled={image.busy}
            onChange={(e) => {
              void image.upload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {value ? <CheckIcon /> : <ImageIcon />}
        </label>
        {value && (
          <button
            type="button"
            className="btn btn-icon"
            aria-label={`Remove ${label}`}
            title={`Remove ${label}`}
            onClick={() => onChange(null)}
          >
            <CloseIcon />
          </button>
        )}
      </div>
      {image.busy && <span className="hint">Uploading...</span>}
      <FieldErrors messages={image.error ? [image.error] : errors} />
    </div>
  );
}
