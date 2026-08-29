import { Router } from 'express';
import { queryCopilot, getRecordDetails } from '../controllers/copilot.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/query', protect, queryCopilot);
router.get('/records/:externalId', protect, getRecordDetails);

export default router;
