import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { previewImport, submitImport } from '../controllers/import.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

// Ensure temporary upload folder exists
const TEMP_DIR = path.join(process.cwd(), 'temp_uploads');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const upload = multer({ 
  dest: TEMP_DIR,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB limit
});

router.post('/preview', protect, upload.single('file'), previewImport);
router.post('/submit', protect, submitImport);

export default router;
