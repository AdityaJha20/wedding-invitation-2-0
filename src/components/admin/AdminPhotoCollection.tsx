import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { apiClient } from '../../utils/apiClient';

interface PhotoCollectionData {
  storage: { enabled: boolean; provider: string | null; productionSafe: boolean; reason: string | null };
  totals: { photos: number; bytes: number; failed: number; guests: number };
  guests: { name: string; count: number; lastUploadAt: string }[];
  photos: { _id: string; guestName: string; originalName: string; mimeType: string; sizeBytes: number; createdAt: string }[];
  failures: { _id: string; guestName: string; originalName: string; error: string; createdAt: string }[];
}

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const defaultUploadUrl = () =>
  `${(import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, '')}/photos`;

const downloadFile = (href: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.click();
};

const QrCodeCard: React.FC = () => {
  const [uploadUrl, setUploadUrl] = useState(defaultUploadUrl);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    QRCode.toDataURL(uploadUrl, { width: 1024, margin: 2, errorCorrectionLevel: 'M' })
      .then((url) => current && setQrDataUrl(url))
      .catch(() => current && setQrDataUrl(null));
    return () => {
      current = false;
    };
  }, [uploadUrl]);

  const downloadSvg = async () => {
    const svg = await QRCode.toString(uploadUrl, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' });
    const href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    downloadFile(href, 'wedding-photos-qr.svg');
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  const isLocal = /localhost|127\.0\.0\.1/.test(uploadUrl);

  return (
    <section className="admin-panel" aria-labelledby="qr-heading">
      <h2 id="qr-heading" className="admin-panel-title">Common Wedding QR Code</h2>
      <p className="admin-panel-note">One QR code for every guest. It opens the private photo-upload page.</p>
      <div className="admin-qr-layout">
        {qrDataUrl && <img className="admin-qr-image" src={qrDataUrl} alt={`QR code for ${uploadUrl}`} />}
        <div className="admin-qr-controls">
          <label className="admin-field">
            <span className="admin-label">Upload page address</span>
            <input className="admin-input" value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value.trim())} />
          </label>
          {isLocal && (
            <p className="admin-warning">
              This is a local development address. Use the public website address before printing.
            </p>
          )}
          <div className="admin-button-row">
            <button
              type="button"
              className="admin-small-btn"
              disabled={!qrDataUrl}
              onClick={() => qrDataUrl && downloadFile(qrDataUrl, 'wedding-photos-qr.png')}
            >
              Download PNG
            </button>
            <button type="button" className="admin-small-btn" onClick={downloadSvg}>
              Download SVG (print)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export const AdminPhotoCollection: React.FC = () => {
  const [data, setData] = useState<PhotoCollectionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiClient.getAdminPhotos();
    if (res.success) setData(res as unknown as PhotoCollectionData);
    else setError(res.message || 'Failed to load the photo collection.');
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin-photos">
      {loading && !data ? (
        <div className="admin-loading-container" role="status">
          <div className="admin-spinner" />
        </div>
      ) : error ? (
        <div className="admin-panel" role="alert">
          <p className="admin-warning">{error}</p>
          <button type="button" className="admin-small-btn" onClick={load}>
            Try Again
          </button>
        </div>
      ) : data ? (
        <>
          <section className="admin-panel" aria-label="Upload storage status">
            <div className="admin-storage-row">
              <span className={`admin-status-dot ${data.storage.enabled ? 'is-on' : 'is-off'}`} aria-hidden="true" />
              <div>
                <strong>Guest uploads {data.storage.enabled ? 'open' : 'closed'}</strong>
                <p className="admin-panel-note">
                  Storage: {data.storage.provider ?? 'none configured'}
                  {data.storage.provider && !data.storage.productionSafe && ' (development only)'}
                  {data.storage.reason && ` · ${data.storage.reason}`}
                </p>
                <p className="admin-panel-note">Google Drive: not connected yet.</p>
              </div>
              <button type="button" className="admin-small-btn" onClick={load} disabled={loading}>
                Refresh
              </button>
            </div>
          </section>

          <div className="admin-stats">
            <div className="admin-stat"><span>{data.totals.photos}</span>Photos received</div>
            <div className="admin-stat"><span>{data.totals.guests}</span>Guests</div>
            <div className="admin-stat"><span>{formatBytes(data.totals.bytes)}</span>Total size</div>
            <div className="admin-stat"><span>{data.totals.failed}</span>Failed uploads</div>
          </div>

          <QrCodeCard />

          <section className="admin-panel" aria-labelledby="guests-heading">
            <h2 id="guests-heading" className="admin-panel-title">Uploads by Guest</h2>
            {data.guests.length === 0 ? (
              <p className="admin-panel-note">No photos received yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Guest</th><th>Photos</th><th>Last upload</th></tr>
                </thead>
                <tbody>
                  {data.guests.map((g) => (
                    <tr key={g.name}>
                      <td>{g.name}</td>
                      <td>{g.count}</td>
                      <td>{formatDate(g.lastUploadAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {data.photos.length > 0 && (
            <section className="admin-panel" aria-labelledby="photos-heading">
              <h2 id="photos-heading" className="admin-panel-title">Recent Photos</h2>
              <table className="admin-table">
                <thead>
                  <tr><th>Guest</th><th>File</th><th>Size</th><th>Received</th><th /></tr>
                </thead>
                <tbody>
                  {data.photos.map((p) => (
                    <tr key={p._id}>
                      <td>{p.guestName}</td>
                      <td className="admin-cell-file">{p.originalName || p.mimeType}</td>
                      <td>{formatBytes(p.sizeBytes)}</td>
                      <td>{formatDate(p.createdAt)}</td>
                      <td className="admin-cell-actions">
                        <a href={apiClient.adminPhotoFileUrl(p._id, true)} target="_blank" rel="noreferrer">View</a>
                        <a href={apiClient.adminPhotoFileUrl(p._id)}>Download</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {data.failures.length > 0 && (
            <section className="admin-panel" aria-labelledby="failures-heading">
              <h2 id="failures-heading" className="admin-panel-title">Recent Upload Failures</h2>
              <table className="admin-table">
                <thead>
                  <tr><th>Guest</th><th>File</th><th>Reason</th><th>When</th></tr>
                </thead>
                <tbody>
                  {data.failures.map((f) => (
                    <tr key={f._id}>
                      <td>{f.guestName}</td>
                      <td className="admin-cell-file">{f.originalName || '—'}</td>
                      <td>{f.error}</td>
                      <td>{formatDate(f.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
};
