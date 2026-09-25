import { Router } from 'express';
import { adminLogin, adminLogout, adminGetMe } from '../controllers/adminController.js';
import { getAdminWishes } from '../controllers/wishController.js';
import { requireAdmin } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/admin/login - Authenticate admin & issue HttpOnly JWT cookie
router.post('/login', loginLimiter, adminLogin);

// POST /api/admin/logout - Clear HttpOnly auth cookie
router.post('/logout', adminLogout);

// GET /api/admin/me - Verify active admin session
router.get('/me', requireAdmin, adminGetMe);

// GET /api/admin/wishes - Fetch all submitted wishes (authenticated)
router.get('/wishes', requireAdmin, getAdminWishes);

export default router;
