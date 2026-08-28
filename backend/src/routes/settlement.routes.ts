import { Router } from 'express';
import { 
  getSettlements, 
  getSettlementById, 
  createSettlement, 
  updateSettlement, 
  linkTransactionsToSettlement 
} from '../controllers/settlement.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, getSettlements);
router.get('/:id', protect, getSettlementById);
router.post('/', protect, createSettlement);
router.patch('/:id', protect, updateSettlement);
router.post('/:id/link-transactions', protect, linkTransactionsToSettlement);

export default router;
