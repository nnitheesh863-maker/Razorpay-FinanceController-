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
import { protect, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// All authenticated users can view invoices and summaries
router.get('/', protect, getInvoices);
router.get('/summary', protect, getInvoiceSummary);
router.get('/:id', protect, getInvoiceById);

// Create, edit, and issue drafts is allowed for ADMIN, FINANCE_MANAGER, and FINANCE_ANALYST
router.post('/', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER, Role.FINANCE_ANALYST), createInvoice);
router.patch('/:id', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER, Role.FINANCE_ANALYST), updateInvoice);
router.post('/:id/issue', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER, Role.FINANCE_ANALYST), issueInvoice);

// Deletion of drafts and cancelling issued invoices is restricted to ADMIN and FINANCE_MANAGER
router.delete('/:id', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER), deleteInvoice);
router.post('/:id/cancel', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER), cancelInvoice);

export default router;
