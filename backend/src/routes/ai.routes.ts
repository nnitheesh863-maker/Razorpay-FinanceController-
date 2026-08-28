import { Router } from 'express';
import { 
  analyzeFinanceQuestion, 
  chatWithAgent, 
  investigateException 
} from '../controllers/ai.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/analyze', protect, analyzeFinanceQuestion);
router.post('/agent/chat', protect, chatWithAgent);
router.post('/exceptions/:id/investigate', protect, investigateException);

export default router;
