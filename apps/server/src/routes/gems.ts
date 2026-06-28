import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as gemController from '../controllers/gemController';
import * as commentController from '../controllers/commentController';
import { requireAuth } from '../middleware/authenticate';
import { uploadGemPhoto } from '../middleware/uploadGemPhoto';

const router = Router();

const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 votes/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are voting too fast' },
});

router.get('/nearby', gemController.nearby);
router.get('/following', requireAuth, gemController.followingFeed);
router.get('/', gemController.list);
router.post('/', requireAuth, uploadGemPhoto, gemController.create);

router.get('/:id', gemController.detail);
router.patch('/:id', requireAuth, uploadGemPhoto, gemController.update);
router.delete('/:id', requireAuth, gemController.remove);

router.post('/:id/vote', requireAuth, voteLimiter, gemController.vote);

// Comments (nested under gem)
router.get('/:gemId/comments', commentController.list);
router.post('/:gemId/comments', requireAuth, commentController.create);
router.delete('/:gemId/comments/:commentId', requireAuth, commentController.remove);

export default router;
