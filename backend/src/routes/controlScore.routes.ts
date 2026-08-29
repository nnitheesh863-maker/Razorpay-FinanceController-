import { Router } from 'express';
import { getControlScore } from '../controllers/controlScore.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, getControlScore);

export default router;
