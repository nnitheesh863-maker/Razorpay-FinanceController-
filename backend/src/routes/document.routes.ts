import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { protect } from '../middleware/auth.middleware';

const router = Router();

const DOCUMENTS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCUMENTS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/', protect, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded.' });
      return;
    }

    const doc = await prisma.document.create({
      data: {
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        objectKey: req.file.filename,
        status: 'PROCESSED',
        source: 'manual'
      }
    });

    res.status(201).json({
      success: true,
      data: doc
    });
  } catch (error: any) {
    console.error('Failed to upload document:', error);
    res.status(500).json({ success: false, message: 'Internal server error during document upload.' });
  }
});

export default router;
