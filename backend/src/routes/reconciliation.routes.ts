import { Router } from 'express';
import multer from 'multer';
import { 
  getReconciliationSummary, 
  getReconciliationRuns, 
  getReconciliationRunById, 
  getReconciliationRecords, 
  getReconciliationRecordById, 
  executeReconciliation,
  compareFiles,
  getBatchChains
} from '../controllers/reconciliation.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file limit
});

router.get('/summary', protect, getReconciliationSummary);
router.get('/runs', protect, getReconciliationRuns);
router.get('/runs/:id', protect, getReconciliationRunById);
router.get('/batch/:runId/chains', protect, getBatchChains);
router.get('/records', protect, getReconciliationRecords);
router.get('/records/:id', protect, getReconciliationRecordById);
router.post('/run', protect, executeReconciliation);

// Mode 1: Two-File Comparison route
router.post(
  '/compare-files', 
  protect, 
  upload.fields([
    { name: 'bankFile', maxCount: 1 },
    { name: 'invoiceFile', maxCount: 1 }
  ]), 
  compareFiles
);

export default router;
