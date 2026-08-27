import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  getState, 
  createTransactions, 
  updateTransaction, 
  deleteTransaction, 
  updatePreferences, 
  uploadDocument, 
  wipeState, 
  getDriveSyncInfo, 
  syncDriveInbox 
} from '../controllers/ledgerly.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Ensure temporary upload folder exists
const TEMP_DIR = path.join(process.cwd(), 'temp_uploads');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Multer upload config for handling multipart receipt/statement files
const upload = multer({ 
  dest: TEMP_DIR,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB maximum file size limit
});

// State retrieval and reset routes
router.get('/state', protect, getState);
router.delete('/state', protect, wipeState);

// Transaction CRUD routes
router.post('/transactions', protect, createTransactions);
router.patch('/transactions/:id', protect, updateTransaction);
router.delete('/transactions/:id', protect, deleteTransaction);

// Preferences routes
router.put('/preferences', protect, updatePreferences);

// Multipart documents upload
router.post('/documents', protect, upload.single('file'), uploadDocument);

// Google Drive Sync API endpoints
router.get('/drive-sync', protect, getDriveSyncInfo);
router.post('/drive-sync', protect, syncDriveInbox);

export default router;
