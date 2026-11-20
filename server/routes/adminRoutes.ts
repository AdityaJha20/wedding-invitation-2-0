import { Router } from 'express';
import { adminLogin, adminLogout, adminGetMe } from '../controllers/adminController.js';
import { getAdminWishes } from '../controllers/wishController.js';
import { getAdminPhotos, downloadAdminPhoto } from '../controllers/photoController.js';
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

// GET /api/admin/photos - Photo collection overview, storage status and failures (authenticated)
router.get('/photos', requireAdmin, getAdminPhotos);

// GET /api/admin/photos/:id/file - Stream one stored photo, admin only (?inline=1 to view)
router.get('/photos/:id/file', requireAdmin, downloadAdminPhoto);

export default router;
