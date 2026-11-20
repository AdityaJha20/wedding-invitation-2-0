import { Readable } from 'stream';
import { LocalDiskProvider } from './LocalDiskProvider.js';

export interface StoredPhotoMeta {
  batchId: string;
  uploadId: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Where guest photos are kept. The upload page and API never know which provider is active,
 * so a Google Drive adapter can be added later by implementing this interface and
 * registering it in `getProviderByName`.
 */
export interface PhotoStorageProvider {
  readonly name: string;
  /** Only durable, private storage may accept guest uploads in production. */
  readonly productionSafe: boolean;
  /** Connected, authenticated and writable right now. */
  isReady(): Promise<boolean>;
  /** Copies the validated temp file into private storage and returns its storage key. */
  save(tempPath: string, meta: StoredPhotoMeta): Promise<string>;
  /** Opens a stored photo for admin-only download. */
  openRead(storageKey: string): Promise<Readable>;
}

const isProduction = () => process.env.NODE_ENV === 'production';

export const getProviderByName = (name: string | undefined): PhotoStorageProvider | null => {
  if (name === 'local') return new LocalDiskProvider(process.env.PHOTO_STORAGE_DIR);
  // Future: if (name === 'gdrive') return new GoogleDriveProvider(...);
  return null;
};

/** Development defaults to local disk; production must name a provider explicitly. */
export const getActivePhotoStorage = (): PhotoStorageProvider | null =>
  getProviderByName(process.env.PHOTO_STORAGE_PROVIDER || (isProduction() ? undefined : 'local'));

export interface UploadAvailability {
  enabled: boolean;
  provider: string | null;
  productionSafe: boolean;
  reason: string | null;
}

/** The single gate for public uploads. Production never falls back to local or temporary storage. */
export const getUploadAvailability = async (): Promise<UploadAvailability> => {
  const provider = getActivePhotoStorage();
  if (!provider) {
    return { enabled: false, provider: null, productionSafe: false, reason: 'No photo storage provider is configured.' };
  }
  const base = { provider: provider.name, productionSafe: provider.productionSafe };
  if (isProduction() && !provider.productionSafe) {
    return { ...base, enabled: false, reason: `"${provider.name}" storage is for development only and is disabled in production.` };
  }
  if (!(await provider.isReady())) {
    return { ...base, enabled: false, reason: `"${provider.name}" storage is not ready (unreachable, unauthenticated or out of space).` };
  }
  return { ...base, enabled: true, reason: null };
};
