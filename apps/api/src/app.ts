import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Config } from './config';
import type { Db } from './db';
import { errorHandler, notFound } from './errors';
import { requireAuth } from './middleware/auth';
import { authRouter } from './routes/auth';
import { materialsRouter } from './routes/materials';
import { publicRouter } from './routes/public';
import { timelinesRouter } from './routes/timelines';
import { uploadsRouter } from './routes/uploads';
import { authService } from './services/auth.service';
import { shareService } from './services/share.service';
import { timelineService } from './services/timeline.service';
import { LocalStorage } from './storage';

export function createApp(config: Config, db: Db): Express {
  const app = express();
  app.disable('x-powered-by');
  // TLS always ends in this process, so forwarded headers are NOT believed by default (they
  // would let clients spoof their IP and bypass the login rate limiter). Behind a reverse
  // proxy that re-encrypts to this API, TRUST_PROXY names that proxy's address so `req.ip`
  // is the real client instead of the proxy (otherwise every user shares one rate limit).
  if (config.TRUST_PROXY) app.set('trust proxy', config.TRUST_PROXY);

  // Defense in depth: never answer a request that did not arrive over TLS.
  if (!config.isTest) {
    app.use((req, res, next) => {
      if (req.secure) return next();
      res.status(403).json({ error: { code: 'HTTPS_REQUIRED', message: 'Use HTTPS.' } });
    });
  }

  app.use(
    helmet({
      // Images are served to the web app, which lives on another origin in dev.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // HSTS is pinned to the host (any port), so it is only sent in production to avoid
      // forcing HTTPS on every other project served from localhost.
      strictTransportSecurity: config.isProd
        ? { maxAge: 31_536_000, includeSubDomains: true }
        : false,
    }),
  );
  app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const guard = requireAuth(config);
  const auth = authService(db);
  const timelines = timelineService(db);
  const shares = shareService(db);
  const storage = new LocalStorage(config.uploadDirAbs);

  // Uploaded images have random names, so they can be cached for a long time.
  app.use('/uploads', express.static(config.uploadDirAbs, { immutable: true, maxAge: '30d' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/auth', authRouter(config, auth));
  app.use('/api/public', publicRouter(shares));

  // Everything below needs a logged-in guide.
  app.use('/api/timelines', guard, timelinesRouter(timelines));
  app.use('/api/uploads', guard, uploadsRouter(storage));
  app.use('/api', guard, materialsRouter(db, shares));

  app.use((_req, _res, next) => next(notFound('This endpoint does not exist.')));
  app.use(errorHandler);
  return app;
}
