import { Router } from 'express';
import { getState, updatePreferences, wipeState, syncGoogleDrive } from '../controllers/state.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/state', protect, getState);
router.delete('/state', protect, wipeState);
router.put('/preferences', protect, updatePreferences);
router.post('/drive-sync', protect, syncGoogleDrive);

export default router;
