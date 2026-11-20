import { Router } from 'express';
import { createPhotoBatch, getPhotoUploadStatus, uploadPhoto } from '../controllers/photoController.js';
import { photoBatchLimiter, photoUploadLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public, upload-only. There is deliberately no route that lists or returns guest photos.

// GET /api/photos/status - Whether uploads are open, plus limits for the upload page
router.get('/status', getPhotoUploadStatus);

// POST /api/photos/batches - Start a submission with the guest's name
router.post('/batches', photoBatchLimiter, createPhotoBatch);

// POST /api/photos/batches/:batchId/photos - Upload one photo (multipart field "photo")
router.post('/batches/:batchId/photos', photoUploadLimiter, uploadPhoto);

export default router;
