import fs from 'fs/promises';
import { createReadStream } from 'fs';
import crypto from 'crypto';

export interface DetectedImage {
  mimeType: string;
  extension: string;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HEIC: DetectedImage = { mimeType: 'image/heic', extension: 'heic' };
const HEIF: DetectedImage = { mimeType: 'image/heif', extension: 'heif' };
const HEIF_BRANDS: Record<string, DetectedImage> = {
  heic: HEIC, heix: HEIC, hevc: HEIC, hevx: HEIC, heim: HEIC, heis: HEIC,
  mif1: HEIF, msf1: HEIF,
};

/** Identifies a photo from its first bytes. The browser-supplied MIME type is never trusted. */
export const detectImageType = (header: Buffer): DetectedImage | null => {
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (header.length >= 8 && header.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (header.length >= 12 && header.toString('latin1', 0, 4) === 'RIFF' && header.toString('latin1', 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  if (header.length >= 12 && header.toString('latin1', 4, 8) === 'ftyp') {
    return HEIF_BRANDS[header.toString('latin1', 8, 12)] ?? null;
  }
  return null;
};

export const readFileHeader = async (filePath: string, length = 16): Promise<Buffer> => {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

export const sha256File = (filePath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
