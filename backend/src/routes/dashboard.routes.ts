import { Router } from 'express';
import { getDashboardOverview } from '../controllers/dashboard.controller';

const router = Router();

// Assuming authentication middleware would be added here
router.get('/overview', getDashboardOverview);

export default router;
