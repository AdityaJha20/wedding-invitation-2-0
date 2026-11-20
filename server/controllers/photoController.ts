import { Request, Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { PhotoBatch, IPhotoBatch } from '../models/PhotoBatch.js';
import { PhotoUpload } from '../models/PhotoUpload.js';
import {
  getActivePhotoStorage,
  getProviderByName,
  getUploadAvailability,
  PhotoStorageProvider,
} from '../storage/PhotoStorageProvider.js';
import { detectImageType, readFileHeader, sha256File } from '../utils/imageSignature.js';

export const MAX_PHOTOS_PER_BATCH = 10;
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const MAX_NAME_LENGTH = 100;
const MAX_CONCURRENT_UPLOADS = 4;
const BATCH_TTL_MS = 24 * 60 * 60 * 1000;
export const PHOTO_TEMP_DIR = path.join(os.tmpdir(), 'wedding-photo-uploads');

const reply = (res: Response, status: number, message: string, extra: Record<string, unknown> = {}) => {
  res.status(status).json({ success: status < 400, message, ...extra });
};

const UPLOADS_CLOSED_MESSAGE = 'Photo sharing is not open yet. Please check back soon.';

/** Removes temp files left behind by uploads interrupted before the last restart. */
export const clearPhotoTempDir = async (): Promise<void> => {
  await fs.rm(PHOTO_TEMP_DIR, { recursive: true, force: true });
  await fs.mkdir(PHOTO_TEMP_DIR, { recursive: true });
};

// ---------------------------------------------------------------------------
// Public guest endpoints
// ---------------------------------------------------------------------------

export const getPhotoUploadStatus = async (_req: Request, res: Response): Promise<void> => {
  const availability = await getUploadAvailability();
  res.status(200).json({
    success: true,
    enabled: availability.enabled,
    maxPhotos: MAX_PHOTOS_PER_BATCH,
    maxFileSizeMB: MAX_PHOTO_BYTES / (1024 * 1024),
  });
};

export const createPhotoBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!(await getUploadAvailability()).enabled) {
      reply(res, 503, UPLOADS_CLOSED_MESSAGE);
      return;
    }
    const { guestName } = req.body || {};
    const trimmedName = typeof guestName === 'string' ? guestName.trim() : '';
    if (!trimmedName) {
      reply(res, 400, 'Please enter your name.');
      return;
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      reply(res, 400, `Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      return;
    }
    const batch = await PhotoBatch.create({ guestName: trimmedName });
    reply(res, 201, 'Ready to receive your photos.', {
      batchId: batch._id.toString(),
      maxPhotos: MAX_PHOTOS_PER_BATCH,
    });
  } catch {
    reply(res, 500, 'Unable to start your upload. Please try again.');
  }
};

const multerUpload = multer({
  dest: PHOTO_TEMP_DIR,
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 2, fieldSize: 1024, parts: 3 },
}).single('photo');

const receiveFile = (req: Request, res: Response) =>
  new Promise<void>((resolve, reject) => multerUpload(req, res, (err) => (err ? reject(err) : resolve())));

const cleanFileName = (name: string | undefined) =>
  (name || '').replace(/[^\w.\- ()]/g, '_').slice(0, 160);

const recordFailure = async (batch: IPhotoBatch, originalName: string | undefined, error: string, extra = {}) => {
  try {
    await PhotoUpload.create({
      batch: batch._id,
      guestName: batch.guestName,
      originalName: cleanFileName(originalName),
      status: 'failed',
      error,
      ...extra,
    });
  } catch (err) {
    console.error('[Photos] Could not record upload failure:', (err as Error).message);
  }
};

let activeUploads = 0;

export const uploadPhoto = async (req: Request, res: Response): Promise<void> => {
  const availability = await getUploadAvailability();
  const storage = getActivePhotoStorage();
  if (!availability.enabled || !storage) {
    reply(res, 503, UPLOADS_CLOSED_MESSAGE);
    return;
  }

  const batchId = String(req.params.batchId);
  const batch = mongoose.isValidObjectId(batchId) ? await PhotoBatch.findById(batchId) : null;
  if (!batch || Date.now() - batch.createdAt.getTime() > BATCH_TTL_MS) {
    reply(res, 404, 'This upload session has expired. Please start again.');
    return;
  }

  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    res.set('Retry-After', '5');
    reply(res, 503, 'Many guests are uploading right now. Retrying shortly…', { retryable: true });
    return;
  }

  activeUploads++;
  const state: UploadState = { slotReserved: false };
  let outcome: Outcome;
  try {
    outcome = await receiveAndStore(req, res, batch, storage, state);
  } catch (err) {
    console.error('[Photos] Upload failed:', (err as Error).message);
    await recordFailure(batch, req.file?.originalname, 'Server or storage error while saving');
    outcome = [500, 'We could not save this photo. Please try again.', { retryable: true }];
  } finally {
    activeUploads--;
    // Clean up before replying, so a finished response always means no leftovers.
    if (state.slotReserved) {
      await PhotoBatch.updateOne({ _id: batch._id }, { $inc: { photoCount: -1 } }).catch(() => undefined);
    }
    if (req.file?.path) await fs.rm(req.file.path, { force: true }).catch(() => undefined);
  }
  if (!res.headersSent) reply(res, ...outcome);
};

type Outcome = [status: number, message: string, extra?: Record<string, unknown>];
interface UploadState {
  slotReserved: boolean;
}

const receiveAndStore = async (
  req: Request,
  res: Response,
  batch: IPhotoBatch,
  storage: PhotoStorageProvider,
  state: UploadState
): Promise<Outcome> => {
  try {
    await receiveFile(req, res);
  } catch (err) {
    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      await recordFailure(batch, undefined, tooLarge ? 'File larger than 20 MB' : `Upload rejected: ${err.code}`);
      return tooLarge
        ? [413, `Each photo must be ${MAX_PHOTO_BYTES / (1024 * 1024)} MB or smaller.`]
        : [400, 'Please upload one photo at a time.'];
    }
    throw err;
  }

  const file = req.file;
  if (!file) return [400, 'Please choose a photo to upload.'];

  const detected = detectImageType(await readFileHeader(file.path));
  if (!detected) {
    await recordFailure(batch, file.originalname, 'Not a supported image (checked file content)', { sizeBytes: file.size });
    return [415, 'Only JPG, PNG, WEBP and HEIC photos can be uploaded.'];
  }

  const sha256 = await sha256File(file.path);
  if (await PhotoUpload.exists({ sha256, status: 'stored' })) {
    return [200, 'This photo was already received.', { duplicate: true }];
  }

  // Atomic slot reservation so parallel uploads can't exceed the per-batch limit.
  const reserved = await PhotoBatch.updateOne(
    { _id: batch._id, photoCount: { $lt: MAX_PHOTOS_PER_BATCH } },
    { $inc: { photoCount: 1 } }
  );
  if (reserved.modifiedCount === 0) {
    return [409, `You can share up to ${MAX_PHOTOS_PER_BATCH} photos at a time. Start a new upload to share more.`];
  }
  state.slotReserved = true;

  const uploadId = new mongoose.Types.ObjectId();
  const storageKey = await storage.save(file.path, {
    batchId: batch._id.toString(),
    uploadId: uploadId.toString(),
    extension: detected.extension,
    mimeType: detected.mimeType,
    sizeBytes: file.size,
  });

  try {
    await PhotoUpload.create({
      _id: uploadId,
      batch: batch._id,
      guestName: batch.guestName,
      originalName: cleanFileName(file.originalname),
      status: 'stored',
      storageProvider: storage.name,
      storageKey,
      mimeType: detected.mimeType,
      sizeBytes: file.size,
      sha256,
    });
  } catch (err) {
    // shortcut: the same photo sent twice at the same instant leaves one unreferenced stored file; add provider.delete() if that ever matters
    if ((err as { code?: number }).code === 11000) {
      return [200, 'This photo was already received.', { duplicate: true }];
    }
    throw err;
  }

  state.slotReserved = false; // slot now belongs to the stored photo
  return [201, 'Photo received.'];
};

// ---------------------------------------------------------------------------
// Admin-only endpoints
// ---------------------------------------------------------------------------

export const getAdminPhotos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totals, guests, photos, failures, storage] = await Promise.all([
      PhotoUpload.aggregate<{ _id: string; count: number; bytes: number }>([
        { $group: { _id: '$status', count: { $sum: 1 }, bytes: { $sum: { $ifNull: ['$sizeBytes', 0] } } } },
      ]),
      PhotoUpload.aggregate<{ _id: string; count: number; lastUploadAt: Date }>([
        { $match: { status: 'stored' } },
        { $group: { _id: '$guestName', count: { $sum: 1 }, lastUploadAt: { $max: '$createdAt' } } },
        { $sort: { lastUploadAt: -1 } },
      ]),
      // shortcut: newest 500 only; add pagination if the collection outgrows one screen
      PhotoUpload.find({ status: 'stored' }, { guestName: 1, originalName: 1, mimeType: 1, sizeBytes: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      PhotoUpload.find({ status: 'failed' }, { guestName: 1, originalName: 1, error: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      getUploadAvailability(),
    ]);

    const stored = totals.find((t) => t._id === 'stored');
    const failed = totals.find((t) => t._id === 'failed');

    res.status(200).json({
      success: true,
      storage,
      totals: {
        photos: stored?.count ?? 0,
        bytes: stored?.bytes ?? 0,
        failed: failed?.count ?? 0,
        guests: guests.length,
      },
      guests: guests.map((g) => ({ name: g._id, count: g.count, lastUploadAt: g.lastUploadAt })),
      photos,
      failures,
    });
  } catch {
    reply(res, 500, 'Failed to load the photo collection.');
  }
};

export const downloadAdminPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const photo = mongoose.isValidObjectId(id) ? await PhotoUpload.findById(id).lean() : null;
    if (!photo || photo.status !== 'stored' || !photo.storageKey) {
      reply(res, 404, 'Photo not found.');
      return;
    }
    const provider = getProviderByName(photo.storageProvider);
    if (!provider) {
      reply(res, 503, 'The storage holding this photo is not available.');
      return;
    }

    const stream = await provider.openRead(photo.storageKey);
    const extension = photo.storageKey.split('.').pop();
    const fileName = `${photo.guestName}-${photo._id}.${extension}`.replace(/[^\w.\-]/g, '_');
    const disposition = req.query.inline === '1' ? 'inline' : 'attachment';

    res.set({
      'Content-Type': photo.mimeType || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    });
    stream.on('error', () => {
      if (!res.headersSent) reply(res, 500, 'Could not read this photo.');
      else res.destroy();
    });
    stream.pipe(res);
  } catch {
    if (!res.headersSent) reply(res, 404, 'Photo file is missing from storage.');
  }
};
