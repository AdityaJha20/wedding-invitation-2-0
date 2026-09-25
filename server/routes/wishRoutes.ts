import { Router } from 'express';
import { submitWish } from '../controllers/wishController.js';
import { wishSubmissionLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/wishes - Public wedding guest wish submission
router.post('/', wishSubmissionLimiter, submitWish);

export default router;
