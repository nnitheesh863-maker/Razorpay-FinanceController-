import { Router } from 'express';
import { 
  getPayments, 
  getPaymentById, 
  getPaymentSummary,
  createPayment,
  refundPayment
} from '../controllers/payment.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Read operations are available to all authenticated roles
router.get('/', protect, getPayments);
router.get('/summary', protect, getPaymentSummary);
router.get('/:id', protect, getPaymentById);

// Recording a payment is allowed for ADMIN, FINANCE_MANAGER, and FINANCE_ANALYST
router.post('/', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER, Role.FINANCE_ANALYST), createPayment);

// Refunding payments is restricted to ADMIN and FINANCE_MANAGER
router.post('/:id/refund', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER), refundPayment);

export default router;
