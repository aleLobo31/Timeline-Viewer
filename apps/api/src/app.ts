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
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Images are served to the web app, which lives on another origin in dev.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
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
