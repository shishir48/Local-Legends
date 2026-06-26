import { Router } from 'express';
import * as userController from '../controllers/userController';
import * as gemController from '../controllers/gemController';
import { requireAuth } from '../middleware/authenticate';

const router = Router();

router.patch('/me', requireAuth, userController.updateMe);
router.get('/:id/gems', userController.gemsBySubmitter);
router.get('/:id/followers', userController.listFollowers);
router.get('/:id/following', userController.listFollowing);
router.post('/:id/follow', requireAuth, userController.toggleFollow);

export default router;
