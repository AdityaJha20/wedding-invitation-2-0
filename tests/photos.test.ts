import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import sharp from 'sharp';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { app } from '../server/app.js';
import { Admin } from '../server/models/Admin.js';
import { PhotoBatch } from '../server/models/PhotoBatch.js';
import { PhotoUpload } from '../server/models/PhotoUpload.js';
import { LocalDiskProvider } from '../server/storage/LocalDiskProvider.js';
import { PHOTO_TEMP_DIR } from '../server/controllers/photoController.js';
import { detectImageType } from '../server/utils/imageSignature.js';
import { signAdminToken } from '../server/utils/jwt.js';

let mongod: MongoMemoryServer;
let storageDir: string;
let adminCookie: string;
let colorSeed = 0;

/** A real, unique JPEG (each call differs so duplicate detection doesn't kick in). */
const makeJpeg = () => {
  colorSeed++;
  return sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: colorSeed % 256, g: (colorSeed * 7) % 256, b: 90 } },
  })
    .jpeg()
    .toBuffer();
};

const startBatch = async (guestName = 'Priya Sharma') => {
  const res = await request(app).post('/api/photos/batches').send({ guestName });
  expect(res.status).toBe(201);
  return res.body.batchId as string;
};

const upload = (batchId: string, buffer: Buffer, filename = 'photo.jpg', contentType = 'image/jpeg') =>
  request(app)
    .post(`/api/photos/batches/${batchId}/photos`)
    .attach('photo', buffer, { filename, contentType });

describe('Guest Photo Collection', () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'photo_test_jwt_secret_value_123456';
    storageDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wedding-photo-store-'));
    process.env.PHOTO_STORAGE_DIR = storageDir;
    delete process.env.PHOTO_STORAGE_PROVIDER;

    await mongoose.connect(mongod.getUri(), { dbName: 'wedding_invitation' });
    await PhotoUpload.syncIndexes();

    const admin = await Admin.create({ email: 'admin@test.wedding', passwordHash: 'unused-hash' });
    adminCookie = `admin_token=${signAdminToken({ id: admin._id.toString(), email: admin.email, role: 'admin' })}`;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
    await fs.rm(storageDir, { recursive: true, force: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('file signature detection', () => {
    it('identifies images by content and rejects everything else', () => {
      expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.mimeType).toBe('image/jpeg');
      expect(detectImageType(Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'))?.mimeType).toBe('image/png');
      expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1'))?.mimeType).toBe('image/webp');
      expect(detectImageType(Buffer.from('\0\0\0\x18ftypheic', 'latin1'))?.mimeType).toBe('image/heic');
      expect(detectImageType(Buffer.from('\0\0\0\x18ftypmif1', 'latin1'))?.mimeType).toBe('image/heif');
      expect(detectImageType(Buffer.from('\0\0\0\x18ftypisom', 'latin1'))).toBeNull(); // MP4 video
      expect(detectImageType(Buffer.from('<?php echo 1; ?>'))).toBeNull();
      expect(detectImageType(Buffer.alloc(0))).toBeNull();
    });
  });

  describe('guest upload flow', () => {
    it('reports uploads as open in development with the limits', async () => {
      const res = await request(app).get('/api/photos/status');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ enabled: true, maxPhotos: 10, maxFileSizeMB: 20 });
      expect(res.body.provider).toBeUndefined(); // storage details stay admin-only
    });

    it('rejects a missing or blank guest name', async () => {
      expect((await request(app).post('/api/photos/batches').send({})).status).toBe(400);
      expect((await request(app).post('/api/photos/batches').send({ guestName: '   ' })).status).toBe(400);
      expect((await request(app).post('/api/photos/batches').send({ guestName: 'x'.repeat(101) })).status).toBe(400);
    });

    it('accepts an anonymous JPEG upload and stores it privately with metadata', async () => {
      const batchId = await startBatch('Rahul Verma');
      const jpeg = await makeJpeg();
      const res = await upload(batchId, jpeg, 'IMG_0001.jpg');
      expect(res.status).toBe(201);

      const record = await PhotoUpload.findOne({ batch: batchId }).lean();
      expect(record).toMatchObject({ status: 'stored', guestName: 'Rahul Verma', mimeType: 'image/jpeg', storageProvider: 'local' });
      expect(record?.storageKey).not.toContain('IMG_0001'); // guest file names never become storage paths
      const stored = await fs.readFile(path.join(storageDir, record!.storageKey!));
      expect(stored.equals(jpeg)).toBe(true);
    });

    it('accepts PNG, WEBP and HEIC by content', async () => {
      const batchId = await startBatch();
      const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#c49e60' } }).png().toBuffer();
      const webp = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#dfbe88' } }).webp().toBuffer();
      const heic = Buffer.concat([Buffer.from('\0\0\0\x18ftypheic\0\0\0\0mif1heic', 'latin1'), Buffer.alloc(64, 7)]);

      expect((await upload(batchId, png, 'a.png', 'image/png')).status).toBe(201);
      expect((await upload(batchId, webp, 'b.webp', 'image/webp')).status).toBe(201);
      expect((await upload(batchId, heic, 'c.heic', 'image/heic')).status).toBe(201);
      const types = (await PhotoUpload.find({ batch: batchId }).lean()).map((p) => p.mimeType).sort();
      expect(types).toEqual(['image/heic', 'image/png', 'image/webp']);
    });

    it('rejects a non-image disguised with a .jpg name and image/jpeg MIME type', async () => {
      const batchId = await startBatch();
      const res = await upload(batchId, Buffer.from('<script>alert(1)</script>'), 'evil.jpg', 'image/jpeg');
      expect(res.status).toBe(415);
      const records = await PhotoUpload.find({ batch: batchId }).lean();
      expect(records).toHaveLength(1);
      expect(records[0].status).toBe('failed');
      expect((await PhotoBatch.findById(batchId))?.photoCount).toBe(0);
    });

    it('rejects photos larger than 20 MB', async () => {
      const batchId = await startBatch();
      const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20 * 1024 * 1024 + 10)]);
      const res = await upload(batchId, big);
      expect(res.status).toBe(413);
      expect(await PhotoUpload.countDocuments({ batch: batchId, status: 'stored' })).toBe(0);
    });

    it('rejects a request with no file, and unknown or malformed batch ids', async () => {
      const batchId = await startBatch();
      expect((await request(app).post(`/api/photos/batches/${batchId}/photos`).field('note', 'x')).status).toBe(400);
      expect((await upload(new mongoose.Types.ObjectId().toString(), await makeJpeg())).status).toBe(404);
      expect((await upload('not-an-id', await makeJpeg())).status).toBe(404);
    });

    it('treats a duplicate photo as already received without counting it twice', async () => {
      const batchId = await startBatch();
      const jpeg = await makeJpeg();
      expect((await upload(batchId, jpeg)).status).toBe(201);
      const again = await upload(batchId, jpeg);
      expect(again.status).toBe(200);
      expect(again.body.duplicate).toBe(true);
      expect(await PhotoUpload.countDocuments({ batch: batchId, status: 'stored' })).toBe(1);
      expect((await PhotoBatch.findById(batchId))?.photoCount).toBe(1);
    });

    it('allows at most 10 photos per submission', async () => {
      const batchId = await startBatch();
      for (let i = 0; i < 10; i++) {
        expect((await upload(batchId, await makeJpeg())).status).toBe(201);
      }
      expect((await upload(batchId, await makeJpeg())).status).toBe(409);
    });

    it('handles simultaneous uploads without exceeding limits or losing photos', async () => {
      const batchId = await startBatch();
      const images = await Promise.all([makeJpeg(), makeJpeg(), makeJpeg(), makeJpeg()]);
      const results = await Promise.all(images.map((img, i) => upload(batchId, img, `p${i}.jpg`)));
      expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201]);
      expect((await PhotoBatch.findById(batchId))?.photoCount).toBe(4);
    });

    it('recovers from a storage failure: slot released, temp file removed, retry succeeds', async () => {
      const batchId = await startBatch();
      const jpeg = await makeJpeg();
      vi.spyOn(LocalDiskProvider.prototype, 'save').mockRejectedValueOnce(new Error('disk unavailable'));

      const failed = await upload(batchId, jpeg);
      expect(failed.status).toBe(500);
      expect((await PhotoBatch.findById(batchId))?.photoCount).toBe(0);
      expect(await fs.readdir(PHOTO_TEMP_DIR)).toHaveLength(0);
      expect(await PhotoUpload.countDocuments({ batch: batchId, status: 'failed' })).toBe(1);

      const retry = await upload(batchId, jpeg);
      expect(retry.status).toBe(201);
      expect((await PhotoBatch.findById(batchId))?.photoCount).toBe(1);
    });

    it('applies rate limiting to photo endpoints', async () => {
      const res = await request(app).post('/api/photos/batches').send({ guestName: 'Limit Check' });
      expect(res.headers['ratelimit-policy'] || res.headers['ratelimit']).toBeDefined();
    });
  });

  describe('privacy', () => {
    it('exposes no public gallery, listing or download routes', async () => {
      const batchId = await startBatch();
      await upload(batchId, await makeJpeg());
      const photo = await PhotoUpload.findOne({ batch: batchId }).lean();

      expect((await request(app).get('/api/photos')).status).toBe(404);
      expect((await request(app).get(`/api/photos/batches/${batchId}`)).status).toBe(404);
      expect((await request(app).get(`/api/photos/batches/${batchId}/photos`)).status).toBe(404);
      expect((await request(app).get('/api/admin/photos')).status).toBe(401);
      expect((await request(app).get(`/api/admin/photos/${photo!._id}/file`)).status).toBe(401);

      // The storage folder is never served as static files
      const direct = await request(app).get(`/.photo-uploads/${photo!.storageKey}`);
      expect(direct.headers['content-type'] || '').not.toMatch(/^image\//);
      const viaStorageKey = await request(app).get(`/${photo!.storageKey}`);
      expect(viaStorageKey.headers['content-type'] || '').not.toMatch(/^image\//);
    });

    it('lets an authenticated admin see the overview and download photos', async () => {
      const overview = await request(app).get('/api/admin/photos').set('Cookie', adminCookie);
      expect(overview.status).toBe(200);
      expect(overview.body.storage).toMatchObject({ enabled: true, provider: 'local', productionSafe: false });
      expect(overview.body.totals.photos).toBeGreaterThan(0);
      expect(overview.body.guests.length).toBeGreaterThan(0);
      expect(overview.body.failures.length).toBeGreaterThan(0);
      expect(overview.body.photos[0].storageKey).toBeUndefined(); // internal paths stay server-side

      const photo = await PhotoUpload.findOne({ status: 'stored' }).lean();
      const file = await request(app)
        .get(`/api/admin/photos/${photo!._id}/file`)
        .set('Cookie', adminCookie)
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });
      expect(file.status).toBe(200);
      expect(file.headers['content-disposition']).toMatch(/^attachment;/);
      expect(file.headers['cache-control']).toBe('private, no-store');
      const stored = await fs.readFile(path.join(storageDir, photo!.storageKey!));
      expect((file.body as Buffer).equals(stored)).toBe(true);
    });
  });

  describe('production gate', () => {
    afterEach(() => {
      process.env.NODE_ENV = 'test';
      delete process.env.PHOTO_STORAGE_PROVIDER;
    });

    it.each([
      ['no provider configured', undefined],
      ['local storage explicitly configured', 'local'],
    ])('keeps public uploads closed in production with %s', async (_label, provider) => {
      const batchId = await startBatch(); // created while still in development
      process.env.NODE_ENV = 'production';
      if (provider) process.env.PHOTO_STORAGE_PROVIDER = provider;
      const before = await PhotoUpload.countDocuments();

      const status = await request(app).get('/api/photos/status');
      expect(status.body.enabled).toBe(false);
      expect((await request(app).post('/api/photos/batches').send({ guestName: 'Guest' })).status).toBe(503);
      expect((await upload(batchId, await makeJpeg())).status).toBe(503);
      expect(await PhotoUpload.countDocuments()).toBe(before);
    });
  });
});
