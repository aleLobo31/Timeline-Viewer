import { Router, type Request } from 'express';
import { z } from 'zod';
import { MATERIAL_TYPES, shareRequestSchema } from '@timeline-viewer/shared';
import type { Db } from '../db';
import { parseOrThrow } from '../errors';
import { currentUserId } from '../middleware/auth';
import type { ShareService } from '../services/share.service';
import { toSummary } from '../services/timeline.service';

const listQuery = z.object({ type: z.enum(MATERIAL_TYPES).optional() });
const bulkShareSchema = shareRequestSchema.extend({
  materialIds: z.array(z.string()).min(1, 'Select at least one timeline to share.'),
});

export function materialsRouter(db: Db, shares: ShareService) {
  const router = Router();

  /** US-F1.9: lean payload (no items) so the library renders quickly. */
  router.get('/materials', async (req, res) => {
    const { type } = parseOrThrow(listQuery, req.query);
    const materials = await db.material.findMany({
      where: { ownerId: currentUserId(req), ...(type ? { type } : {}) },
      include: { share: true },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ materials: materials.map(toSummary) });
  });

  /** US-F1.5: share one or more materials with the chosen method. */
  router.post('/shares', async (req, res) => {
    const { materialIds, method } = parseOrThrow(bulkShareSchema, req.body);
    res.json({ shares: await shares.share(currentUserId(req), materialIds, method) });
  });

  router.delete('/materials/:id/share', async (req: Request, res) => {
    await shares.unshare(currentUserId(req), String(req.params.id));
    res.status(204).end();
  });

  return router;
}
