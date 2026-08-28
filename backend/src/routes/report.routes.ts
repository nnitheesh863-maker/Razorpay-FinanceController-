import { Router } from 'express';
import { getReportMetrics, getReportCharts } from '../controllers/report.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/metrics', protect, getReportMetrics);
router.get('/charts', protect, getReportCharts);

export default router;
