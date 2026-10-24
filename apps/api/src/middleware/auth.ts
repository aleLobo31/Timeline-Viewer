import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Config } from '../config';
import { unauthorized } from '../errors';

export const SESSION_COOKIE = 'tv_session';
const SESSION_DAYS = 7;

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

export function sessionCookieOptions(config: Config): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function signSession(config: Config, userId: string): string {
  return jwt.sign({}, config.JWT_SECRET, { subject: userId, expiresIn: `${SESSION_DAYS}d` });
}

export function readSession(config: Config, req: Request): string | null {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string') return null;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function requireAuth(config: Config) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userId = readSession(config, req);
    if (!userId) return next(unauthorized());
    req.userId = userId;
    next();
  };
}

/** Handlers behind requireAuth can rely on a user id being present. */
export function currentUserId(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
