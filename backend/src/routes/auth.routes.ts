import { Router } from 'express';
import { register, login, getMe, logout, getProviders, getAdminUsersAudit, adminRegister, adminLogin } from '../controllers/auth.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

router.post('/signup', register);
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', logout);
router.get('/providers', getProviders);
router.get('/admin/users-audit', protect, authorize('ADMIN'), getAdminUsersAudit);
router.post('/admin/register', adminRegister);
router.post('/admin/login', adminLogin);

export default router;
