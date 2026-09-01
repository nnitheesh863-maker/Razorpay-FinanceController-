import { Router } from 'express';
import { getAdminDashboardMetrics } from '../controllers/admin.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);
router.use(authorize('ADMIN'));

router.get('/dashboard', getAdminDashboardMetrics);

export default router;
