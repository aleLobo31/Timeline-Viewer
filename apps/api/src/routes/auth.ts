import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema, registerSchema } from '@timeline-viewer/shared';
import type { Config } from '../config';
import { parseOrThrow, unauthorized } from '../errors';
import { readSession, SESSION_COOKIE, sessionCookieOptions, signSession } from '../middleware/auth';
import type { AuthService } from '../services/auth.service';

export function authRouter(config: Config, auth: AuthService) {
  const router = Router();

  // Brute-force protection for credential endpoints (not applied in tests).
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.isTest,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please wait a few minutes and try again.',
      },
    },
  });

  const startSession = (res: import('express').Response, userId: string) =>
    res.cookie(SESSION_COOKIE, signSession(config, userId), sessionCookieOptions(config));

  router.post('/register', limiter, async (req, res) => {
    const input = parseOrThrow(registerSchema, req.body);
    const user = await auth.register(input);
    startSession(res, user.id);
    res.status(201).json({ user });
  });

  router.post('/login', limiter, async (req, res) => {
    const input = parseOrThrow(loginSchema, req.body);
    const user = await auth.login(input);
    startSession(res, user.id);
    res.json({ user });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(config), maxAge: undefined });
    res.status(204).end();
  });

  router.get('/me', async (req, res) => {
    const userId = readSession(config, req);
    const user = userId ? await auth.getById(userId) : null;
    if (!user) throw unauthorized();
    res.json({ user });
  });

  return router;
}
