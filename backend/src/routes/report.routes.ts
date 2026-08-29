import { Router } from 'express';
import { getReportMetrics, getReportCharts, getAccuracyReport } from '../controllers/report.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/metrics', protect, getReportMetrics);
router.get('/charts', protect, getReportCharts);
router.get('/accuracy', protect, getAccuracyReport);

export default router;
