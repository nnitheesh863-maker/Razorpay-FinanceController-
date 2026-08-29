import { Router } from 'express';
import { 
  connectRazorpay, 
  getRazorpayStatus, 
  syncRazorpay 
} from '../controllers/integration.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/razorpay/connect', protect, connectRazorpay);
router.get('/razorpay/status', protect, getRazorpayStatus);
router.post('/razorpay/sync', protect, syncRazorpay);

export default router;
