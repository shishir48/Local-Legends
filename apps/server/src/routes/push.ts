import { Router } from 'express';
import * as pushController from '../controllers/pushController';
import { requireAuth } from '../middleware/authenticate';

const router = Router();

router.post('/register', requireAuth, pushController.register);
router.delete('/register', requireAuth, pushController.unregister);

export default router;
