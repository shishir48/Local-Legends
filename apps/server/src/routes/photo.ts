import { Router, type Request, type Response } from 'express';
import { readImage } from '../lib/imageStore';

const router = Router();

// GET /api/photo/:id — stream a self-hosted gem photo from disk.
router.get('/:id', (req: Request, res: Response) => {
  const img = readImage(req.params.id);
  if (!img) {
    return res.status(404).json({ error: 'Photo not found' });
  }
  res.setHeader('Content-Type', img.contentType);
  res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30d
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.send(img.buffer);
});

export default router;
