import type { ErrorRequestHandler } from 'express';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import type { ApiErrorBody, ValidationIssue } from '@timeline-viewer/shared';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public issues?: ValidationIssue[],
  ) {
    super(message);
  }
}

export const badRequest = (message: string, issues?: ValidationIssue[]) =>
  new HttpError(400, 'VALIDATION_ERROR', message, issues);
export const unauthorized = (message = 'You need to log in to do this.') =>
  new HttpError(401, 'UNAUTHORIZED', message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message: string, issues?: ValidationIssue[]) =>
  new HttpError(409, 'CONFLICT', message, issues);

/** Parses `data` with a zod schema or throws a 400 listing every problem. */
export function parseOrThrow<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  throw fromZod(result.error);
}

export function fromZod(error: ZodError): HttpError {
  const issues = error.issues.map((i) => ({ path: i.path, message: i.message }));
  return badRequest(issues[0]?.message ?? 'Invalid request.', issues);
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let http: HttpError;
  if (err instanceof HttpError) http = err;
  else if (err instanceof ZodError) http = fromZod(err);
  else if (err?.type === 'entity.parse.failed')
    http = badRequest('The request body is not valid JSON.');
  else if (err?.type === 'entity.too.large')
    http = new HttpError(413, 'TOO_LARGE', 'The request is too large.');
  else if (err?.name === 'MulterError') {
    http = badRequest(
      err.code === 'LIMIT_FILE_SIZE'
        ? 'The image is too large (maximum 5 MB).'
        : 'The image could not be uploaded.',
    );
  } else {
    console.error(err);
    http = new HttpError(500, 'INTERNAL', 'Something went wrong. Please try again.');
  }

  const body: ApiErrorBody = {
    error: {
      code: http.code,
      message: http.message,
      ...(http.issues ? { issues: http.issues } : {}),
    },
  };
  res.status(http.status).json(body);
};
