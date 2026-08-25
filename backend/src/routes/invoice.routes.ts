import { Router } from 'express';
import { 
  getInvoices, 
  getInvoiceById, 
  getInvoiceSummary 
} from '../controllers/invoice.controller';

const router = Router();

// Assuming authentication middleware would be added here
router.get('/', getInvoices);
router.get('/summary', getInvoiceSummary);
router.get('/:id', getInvoiceById);

export default router;
