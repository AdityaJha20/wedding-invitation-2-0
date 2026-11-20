import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../../styles/photo-upload.css';
import { apiClient, PhotoUploadHandle } from '../../utils/apiClient';

type ItemStatus = 'ready' | 'uploading' | 'done' | 'failed' | 'cancelled';

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  previewFailed: boolean;
  status: ItemStatus;
  progress: number;
  message?: string;
}

const MAX_PHOTOS = 10;
const MAX_BYTES = 20 * 1024 * 1024;
const PARALLEL_UPLOADS = 2;
const AUTO_RETRIES = 2;
// The server checks real file content; this only gives guests early feedback.
const ACCEPTED_MIME = /^image\/(jpeg|png|webp|heic|heif)$/i;
const ACCEPTED_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;

const isAcceptedFile = (file: File) => ACCEPTED_MIME.test(file.type) || ACCEPTED_EXT.test(file.name);
const fileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let nextItemId = 0;

export const PhotoUploadPage: React.FC = () => {
  const [availability, setAvailability] = useState<'loading' | 'open' | 'closed' | 'error'>('loading');
  const [guestName, setGuestName] = useState('');
  const [items, setItems] = useState<UploadItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const batchIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const handlesRef = useRef(new Map<string, PhotoUploadHandle>());
  const previewUrlsRef = useRef(new Set<string>());

  const checkAvailability = useCallback(async () => {
    setAvailability('loading');
    const res = await apiClient.getPhotoUploadStatus();
    setAvailability(!res.success ? 'error' : res.enabled ? 'open' : 'closed');
  }, []);

  useEffect(() => {
    checkAvailability();
    const urls = previewUrlsRef.current;
    const handles = handlesRef.current;
    return () => {
      handles.forEach((h) => h.abort());
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [checkAvailability]);

  const patchItem = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const known = new Set(items.map((i) => fileKey(i.file)));
    const next = [...items];
    let wrongType = 0;
    let tooLarge = 0;
    let overLimit = 0;

    for (const file of Array.from(fileList)) {
      if (known.has(fileKey(file))) continue;
      if (!isAcceptedFile(file)) wrongType++;
      else if (file.size > MAX_BYTES) tooLarge++;
      else if (next.length >= MAX_PHOTOS) overLimit++;
      else {
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
        known.add(fileKey(file));
        next.push({ id: `p${nextItemId++}`, file, previewUrl, previewFailed: false, status: 'ready', progress: 0 });
      }
    }

    const messages = [
      wrongType && `${wrongType} file${wrongType > 1 ? 's are' : ' is'} not a JPG, PNG, WEBP or HEIC photo.`,
      tooLarge && `${tooLarge} photo${tooLarge > 1 ? 's are' : ' is'} larger than 20 MB.`,
      overLimit && `You can share up to ${MAX_PHOTOS} photos at a time.`,
    ].filter(Boolean);
    setNotice(messages.length ? messages.join(' ') : null);
    setItems(next);
  };

  const removeItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      URL.revokeObjectURL(item.previewUrl);
      previewUrlsRef.current.delete(item.previewUrl);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const uploadOne = async (item: UploadItem) => {
    for (let attempt = 0; ; attempt++) {
      patchItem(item.id, { status: 'uploading', progress: 0, message: undefined });
      const handle = apiClient.uploadPhoto(batchIdRef.current as string, item.file, (progress) =>
        patchItem(item.id, { progress })
      );
      handlesRef.current.set(item.id, handle);
      const result = await handle.promise;
      handlesRef.current.delete(item.id);

      if (result.success) {
        patchItem(item.id, { status: 'done', progress: 1, message: result.duplicate ? 'Already received' : undefined });
        return;
      }
      if (result.status === -1) {
        patchItem(item.id, { status: 'cancelled', progress: 0, message: 'Cancelled' });
        return;
      }
      const retryable = result.status === 0 || result.status >= 500;
      if (retryable && attempt < AUTO_RETRIES && !cancelledRef.current) {
        patchItem(item.id, { message: 'Connection hiccup, retrying…' });
        await wait(2000 * (attempt + 1));
        continue;
      }
      if (result.status === 404) batchIdRef.current = null; // expired session: next attempt starts a new one
      patchItem(item.id, { status: 'failed', progress: 0, message: result.message });
      return;
    }
  };

  const startUpload = async () => {
    const name = guestName.trim();
    if (!name) {
      setNotice('Please enter your name so the couple knows who shared these photos.');
      return;
    }
    const pending = items.filter((i) => i.status === 'ready' || i.status === 'failed' || i.status === 'cancelled');
    if (pending.length === 0) {
      setNotice('Please choose at least one photo.');
      return;
    }

    setNotice(null);
    setIsUploading(true);
    cancelledRef.current = false;

    if (!batchIdRef.current) {
      const res = await apiClient.createPhotoBatch(name);
      if (!res.success || !res.batchId) {
        setNotice(res.message || 'Unable to start your upload. Please try again.');
        setIsUploading(false);
        return;
      }
      batchIdRef.current = res.batchId;
    }

    const queue = [...pending];
    const worker = async () => {
      while (queue.length > 0 && !cancelledRef.current) {
        await uploadOne(queue.shift() as UploadItem);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL_UPLOADS, queue.length) }, worker));
    setIsUploading(false);
  };

  const cancelUpload = () => {
    cancelledRef.current = true;
    handlesRef.current.forEach((handle) => handle.abort());
  };

  const shareMore = () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
    batchIdRef.current = null;
    setItems([]);
    setNotice(null);
  };

  const doneCount = items.filter((i) => i.status === 'done').length;
  const pendingCount = items.filter((i) => i.status !== 'done' && i.status !== 'uploading').length;
  const hasRetries = items.some((i) => i.status === 'failed' || i.status === 'cancelled');
  const allDone = items.length > 0 && doneCount === items.length && !isUploading;
  const nameLocked = isUploading || doneCount > 0;

  const renderBody = () => {
    if (availability === 'loading') {
      return <p className="pu-status-text" role="status">Preparing the photo album…</p>;
    }
    if (availability === 'error') {
      return (
        <div className="pu-state" role="alert">
          <p className="pu-status-text">We couldn't reach the server. Please check your connection.</p>
          <button type="button" className="pu-btn pu-btn-secondary" onClick={checkAvailability}>
            Try Again
          </button>
        </div>
      );
    }
    if (availability === 'closed') {
      return (
        <div className="pu-state" role="status">
          <h2 className="pu-state-title">Photo sharing opens soon</h2>
          <p className="pu-status-text">
            Please come back to this page during the celebration to share your photographs with the couple.
          </p>
        </div>
      );
    }
    if (allDone) {
      return (
        <div className="pu-state pu-success" role="status" aria-live="polite">
          <div className="pu-success-mark" aria-hidden="true">✦</div>
          <h2 className="pu-state-title">Thank you, {guestName.trim()}!</h2>
          <p className="pu-status-text">
            {doneCount} {doneCount === 1 ? 'photo has' : 'photos have'} been shared privately with Sarthak &amp; Manya.
          </p>
          <button type="button" className="pu-btn pu-btn-secondary" onClick={shareMore}>
            Share More Photos
          </button>
        </div>
      );
    }

    return (
      <form
        className="pu-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isUploading) startUpload();
        }}
      >
        <label className="pu-field">
          <span className="pu-label">Your name</span>
          <input
            className="pu-input"
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            maxLength={100}
            autoComplete="name"
            placeholder="e.g. Priya Sharma"
            disabled={nameLocked}
            required
          />
        </label>

        <label className={`pu-picker ${isUploading || items.length >= MAX_PHOTOS ? 'is-disabled' : ''}`}>
          <input
            className="pu-visually-hidden"
            type="file"
            accept="image/*"
            multiple
            disabled={isUploading || items.length >= MAX_PHOTOS}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = ''; // allow picking the same photo again after removing it
            }}
          />
          <span className="pu-picker-icon" aria-hidden="true">＋</span>
          <span className="pu-picker-title">{items.length ? 'Add more photos' : 'Choose photos'}</span>
          <span className="pu-picker-hint">
            Up to {MAX_PHOTOS} photos · JPG, PNG, WEBP or HEIC · 20 MB each
          </span>
        </label>

        {notice && (
          <p className="pu-notice" role="alert">
            {notice}
          </p>
        )}

        {items.length > 0 && (
          <>
            <ul className="pu-grid" aria-label="Selected photos">
              {items.map((item) => (
                <li key={item.id} className={`pu-tile is-${item.status}`}>
                  {item.previewFailed ? (
                    <div className="pu-tile-fallback">
                      {(item.file.name.split('.').pop() || 'photo').toUpperCase()}
                    </div>
                  ) : (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      onError={() => patchItem(item.id, { previewFailed: true })}
                    />
                  )}

                  {item.status === 'uploading' && (
                    <div
                      className="pu-progress"
                      role="progressbar"
                      aria-label={`Uploading ${item.file.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(item.progress * 100)}
                    >
                      <span style={{ width: `${Math.round(item.progress * 100)}%` }} />
                    </div>
                  )}
                  {item.status === 'done' && <span className="pu-tile-badge" aria-label="Uploaded">✓</span>}
                  {(item.status === 'failed' || item.status === 'cancelled') && (
                    <span className="pu-tile-badge is-error" aria-hidden="true">!</span>
                  )}
                  {item.message && <span className="pu-tile-message">{item.message}</span>}

                  {!isUploading && item.status !== 'done' && (
                    <button
                      type="button"
                      className="pu-tile-remove"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.file.name}`}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <p className="pu-summary" aria-live="polite">
              {doneCount} of {items.length} uploaded
            </p>
          </>
        )}

        {isUploading ? (
          <button type="button" className="pu-btn pu-btn-secondary" onClick={cancelUpload}>
            Cancel Upload
          </button>
        ) : (
          <button type="submit" className="pu-btn" disabled={pendingCount === 0}>
            {hasRetries ? `Retry ${pendingCount} ${pendingCount === 1 ? 'Photo' : 'Photos'}` : 'Upload Photos'}
          </button>
        )}
      </form>
    );
  };

  return (
    <div className="pu-viewport">
      <main className="pu-card">
        <header className="pu-header">
          <p className="pu-couple">Sarthak &amp; Manya</p>
          <div className="pu-ornament" aria-hidden="true">
            <span />❖<span />
          </div>
          <h1 className="pu-title">Share Your Photos</h1>
          <p className="pu-subtitle">Help us relive the celebration through your eyes.</p>
        </header>

        {renderBody()}

        <p className="pu-privacy">
          Your photos go privately to the couple. There is no public gallery, and other guests cannot see them.
        </p>
      </main>
    </div>
  );
};

export default PhotoUploadPage;
