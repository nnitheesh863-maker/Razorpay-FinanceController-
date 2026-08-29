import { Router } from 'express';
import multer from 'multer';
import { 
  uploadFile, 
  getImports, 
  getImportById, 
  getImportPreview,
  normalizeImportBatch,
  getImportStats,
  uploadBatch
} from '../controllers/import.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Configure multer to store uploaded files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file limit
});

router.post('/upload', protect, upload.single('file'), uploadFile);
router.post(
  '/upload-batch',
  protect,
  upload.fields([
    { name: 'invoiceFile', maxCount: 1 },
    { name: 'paymentFile', maxCount: 1 },
    { name: 'settlementFile', maxCount: 1 },
    { name: 'bankFile', maxCount: 1 }
  ]),
  uploadBatch
);
router.post('/:id/normalize', protect, normalizeImportBatch);
router.get('/stats', protect, getImportStats);
router.get('/', protect, getImports);
router.get('/:id', protect, getImportById);
router.get('/:id/preview', protect, getImportPreview);

export default router;
