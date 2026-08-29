import { Router } from 'express';
import { getCashSummary, getCashForecast } from '../controllers/cash.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/summary', protect, getCashSummary);
router.get('/forecast', protect, getCashForecast);

export default router;
