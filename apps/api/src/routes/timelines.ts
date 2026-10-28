import { Router, type Request } from 'express';
import { currentUserId } from '../middleware/auth';
import type { TimelineService } from '../services/timeline.service';

const idParam = (req: Request) => String(req.params.id);

export function timelinesRouter(timelines: TimelineService) {
  const router = Router();

  router.post('/', async (req, res) => {
    res.status(201).json({ timeline: await timelines.create(currentUserId(req), req.body) });
  });

  router.get('/:id', async (req, res) => {
    res.json({ timeline: await timelines.get(currentUserId(req), idParam(req)) });
  });

  router.put('/:id', async (req, res) => {
    res.json({ timeline: await timelines.update(currentUserId(req), idParam(req), req.body) });
  });

  router.delete('/:id', async (req, res) => {
    await timelines.remove(currentUserId(req), idParam(req));
    res.status(204).end();
  });

  return router;
}
