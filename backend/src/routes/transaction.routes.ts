import { Router } from 'express';
import { 
  getTransactions, 
  getTransactionById, 
  getTransactionSummary 
} from '../controllers/transaction.controller';

const router = Router();

// Assuming authentication middleware would be added here
router.get('/', getTransactions);
router.get('/summary', getTransactionSummary);
router.get('/:id', getTransactionById);

export default router;
