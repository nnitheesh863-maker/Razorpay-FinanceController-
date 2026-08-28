import { Router } from 'express';
import { 
  getReconciliationSummary, 
  getReconciliationRuns, 
  getReconciliationRunById, 
  getReconciliationRecords, 
  getReconciliationRecordById, 
  executeReconciliation 
} from '../controllers/reconciliation.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/summary', protect, getReconciliationSummary);
router.get('/runs', protect, getReconciliationRuns);
router.get('/runs/:id', protect, getReconciliationRunById);
router.get('/records', protect, getReconciliationRecords);
router.get('/records/:id', protect, getReconciliationRecordById);
router.post('/run', protect, executeReconciliation);

export default router;
