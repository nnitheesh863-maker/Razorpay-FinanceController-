import { Router } from 'express';
import { 
  getInvoices, 
  getInvoiceById, 
  getInvoiceSummary, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice, 
  issueInvoice, 
  cancelInvoice 
} from '../controllers/invoice.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, getInvoices);
router.get('/summary', protect, getInvoiceSummary);
router.get('/:id', protect, getInvoiceById);
router.post('/', protect, createInvoice);
router.patch('/:id', protect, updateInvoice);
router.delete('/:id', protect, deleteInvoice);
router.post('/:id/issue', protect, issueInvoice);
router.post('/:id/cancel', protect, cancelInvoice);

export default router;
