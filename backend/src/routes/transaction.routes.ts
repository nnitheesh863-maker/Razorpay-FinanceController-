import { Router } from 'express';
import { 
  getTransactions, 
  getTransactionById, 
  getTransactionSummary,
  createTransaction,
  updateTransaction,
  cancelTransaction
} from '../controllers/transaction.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Read operations are allowed for all authenticated users
router.get('/', protect, getTransactions);
router.get('/summary', protect, getTransactionSummary);
router.get('/:id', protect, getTransactionById);

// Create and edit operations are allowed for ADMIN, FINANCE_MANAGER, and FINANCE_ANALYST
router.post('/', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER, Role.FINANCE_ANALYST), createTransaction);
router.patch('/:id', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER, Role.FINANCE_ANALYST), updateTransaction);

// Cancel (Soft Delete) operations are restricted to ADMIN and FINANCE_MANAGER
router.delete('/:id', protect, authorize(Role.ADMIN, Role.FINANCE_MANAGER), cancelTransaction);

export default router;
