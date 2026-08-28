import { Router } from 'express';
import { 
  getPayments, 
  getPaymentById, 
  getPaymentSummary, 
  createPayment, 
  refundPayment 
} from '../controllers/payment.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, getPayments);
router.get('/summary', protect, getPaymentSummary);
router.get('/:id', protect, getPaymentById);
router.post('/', protect, createPayment);
router.post('/:id/refund', protect, refundPayment);

export default router;
