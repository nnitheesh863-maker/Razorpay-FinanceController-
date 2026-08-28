import { Router } from 'express';
import { 
  getTransactions, 
  getTransactionById, 
  getTransactionSummary, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction 
} from '../controllers/transaction.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, getTransactions);
router.get('/summary', protect, getTransactionSummary);
router.get('/:id', protect, getTransactionById);
router.post('/', protect, createTransaction);
router.patch('/:id', protect, updateTransaction);
router.delete('/:id', protect, deleteTransaction);

export default router;
