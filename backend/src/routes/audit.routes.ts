import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Only ADMIN and FINANCE_MANAGER can read audit logs
router.get('/', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER), getAuditLogs);

export default router;
