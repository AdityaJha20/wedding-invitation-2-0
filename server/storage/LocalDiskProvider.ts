import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import type { PhotoStorageProvider, StoredPhotoMeta } from './PhotoStorageProvider.js';

const MIN_FREE_BYTES = 1024 * 1024 * 1024; // keep 1 GB free so uploads can't fill the disk

/**
 * Private local-disk storage for development and testing only.
 * The folder lives outside `dist/` and is never served statically; files are reachable
 * only through the admin download endpoint.
 */
export class LocalDiskProvider implements PhotoStorageProvider {
  readonly name = 'local';
  readonly productionSafe = false;
  private readonly root: string;

  constructor(root?: string) {
    this.root = path.resolve(root || path.join(process.cwd(), '.photo-uploads'));
  }

  async isReady(): Promise<boolean> {
    try {
      await fs.mkdir(this.root, { recursive: true });
      const stats = await fs.statfs(this.root);
      return stats.bavail * stats.bsize > MIN_FREE_BYTES;
    } catch {
      return false;
    }
  }

  async save(tempPath: string, meta: StoredPhotoMeta): Promise<string> {
    const day = new Date().toISOString().slice(0, 10);
    const key = path.posix.join(day, meta.batchId, `${meta.uploadId}.${meta.extension}`);
    const destination = this.resolveKey(key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    // copy (not rename): the temp dir may be on another drive
    await fs.copyFile(tempPath, destination, fs.constants.COPYFILE_EXCL);
    return key;
  }

  async openRead(storageKey: string): Promise<Readable> {
    const filePath = this.resolveKey(storageKey);
    await fs.access(filePath);
    return createReadStream(filePath);
  }

  private resolveKey(key: string): string {
    const resolved = path.resolve(this.root, key);
    if (!resolved.startsWith(this.root + path.sep)) {
      throw new Error('Invalid storage key.');
    }
    return resolved;
  }
}
