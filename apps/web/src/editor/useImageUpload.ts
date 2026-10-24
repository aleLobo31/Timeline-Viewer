import { useState } from 'react';
import { api, ApiError } from '../api/client';

/** Uploads an image through the API and reports the resulting URL. */
export function useImageUpload(onUploaded: (url: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.upload('/api/uploads/image', file);
      onUploaded(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The image could not be uploaded.');
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, upload };
}
