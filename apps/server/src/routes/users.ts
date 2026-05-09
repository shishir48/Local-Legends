import { Router } from 'express';
import * as userController from '../controllers/userController';
import { requireAuth } from '../middleware/authenticate';

const router = Router();

router.patch('/me', requireAuth, userController.updateMe);
router.get('/:id/gems', userController.gemsBySubmitter);

export default router;
