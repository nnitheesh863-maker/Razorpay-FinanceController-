import { Router } from 'express';
import { 
  getExceptions, 
  getExceptionById, 
  getExceptionSummary, 
  getExceptionAnalytics, 
  assignException, 
  updateExceptionStatus, 
  resolveException, 
  reopenException, 
  addExceptionNote, 
  exportExceptions 
} from '../controllers/exception.controller';
import { investigateException } from '../controllers/ai.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, getExceptions);
router.get('/summary', protect, getExceptionSummary);
router.get('/analytics', protect, getExceptionAnalytics);
router.get('/export', protect, exportExceptions);
router.get('/:id', protect, getExceptionById);
router.patch('/:id/assign', protect, assignException);
router.patch('/:id/status', protect, updateExceptionStatus);
router.patch('/:id/resolve', protect, resolveException);
router.patch('/:id/reopen', protect, reopenException);
router.post('/:id/notes', protect, addExceptionNote);

// Exception investigation triggers AI model analysis
router.post('/:id/investigate', protect, investigateException);

export default router;
