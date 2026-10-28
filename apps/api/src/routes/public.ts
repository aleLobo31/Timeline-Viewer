import { Router } from 'express';
import type { ShareService } from '../services/share.service';

/** Unauthenticated, read-only tourist access. */
export function publicRouter(shares: ShareService) {
  const router = Router();

  router.get('/s/:token', async (req, res) => {
    // A guide can unshare at any time: never let caches keep serving it.
    res.set('Cache-Control', 'no-store');
    res.json({ timeline: await shares.getPublicTimeline(String(req.params.token)) });
  });

  return router;
}
