import { Router } from 'express';
import multer from 'multer';
import { badRequest } from '../errors';
import type { StorageProvider } from '../storage';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function uploadsRouter(storage: StorageProvider) {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED.has(file.mimetype)) cb(null, true);
      else cb(badRequest('Only JPEG, PNG, WebP or GIF images are accepted.'));
    },
  });

  router.post('/image', upload.single('image'), async (req, res) => {
    if (!req.file) throw badRequest('Select an image to upload.');
    try {
      res.status(201).json({ url: await storage.saveImage(req.file.buffer) });
    } catch {
      throw badRequest('The file is not a valid image.');
    }
  });

  return router;
}
