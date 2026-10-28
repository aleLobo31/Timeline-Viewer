import type { ApiErrorBody, ValidationIssue } from '@timeline-viewer/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public issues: ValidationIssue[] = [],
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK',
      'The server could not be reached. Check your connection and try again.',
    );
  }

  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => null)) as (ApiErrorBody & T) | null;
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'ERROR',
      err?.message ?? 'Something went wrong.',
      err?.issues,
    );
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T>(url: string, body: unknown) => request<T>('PUT', url, body),
  delete: <T>(url: string, body?: unknown) => request<T>('DELETE', url, body),
  async upload(url: string, file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append('image', file);
    let res: Response;
    try {
      res = await fetch(url, { method: 'POST', credentials: 'include', body: form });
    } catch {
      throw new ApiError(0, 'NETWORK', 'The server could not be reached.');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(
        res.status,
        data?.error?.code ?? 'ERROR',
        data?.error?.message ?? 'Upload failed.',
      );
    }
    return data;
  },
};

/** Issues of a failed request grouped as { "email": ["msg"] } by their first path segment. */
export function fieldErrors(error: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (error instanceof ApiError) {
    for (const issue of error.issues) {
      const key = String(issue.path[0] ?? '_');
      (out[key] ??= []).push(issue.message);
    }
  }
  return out;
}
