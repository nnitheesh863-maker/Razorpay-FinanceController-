import { Router } from 'express';
import { handleWebhook } from '../controllers/integration.controller';

const router = Router();

// Public webhook route (validates HMAC signature internally)
router.post('/razorpay', handleWebhook);

export default router;
