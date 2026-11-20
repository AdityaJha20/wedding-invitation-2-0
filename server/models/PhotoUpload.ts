import mongoose, { Document, Schema, Types } from 'mongoose';

/** Metadata for one guest photo. The file itself lives in the storage provider, never in MongoDB. */
export interface IPhotoUpload extends Document {
  batch: Types.ObjectId;
  guestName: string;
  originalName: string;
  status: 'stored' | 'failed';
  storageProvider?: string;
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  sha256?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const photoUploadSchema = new Schema<IPhotoUpload>(
  {
    batch: { type: Schema.Types.ObjectId, ref: 'PhotoBatch', required: true, index: true },
    guestName: { type: String, required: true, trim: true, maxlength: 100 },
    originalName: { type: String, default: '', maxlength: 160 },
    status: { type: String, enum: ['stored', 'failed'], required: true },
    storageProvider: { type: String },
    storageKey: { type: String },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    sha256: { type: String },
    error: { type: String, maxlength: 300 },
  },
  { timestamps: true, collection: 'photo_uploads' }
);

photoUploadSchema.index({ createdAt: -1 });
photoUploadSchema.index({ status: 1, createdAt: -1 });
// The same photo is stored once, whoever sends it; retries become harmless.
photoUploadSchema.index(
  { sha256: 1 },
  { unique: true, partialFilterExpression: { status: 'stored' } }
);

export const PhotoUpload = mongoose.model<IPhotoUpload>('PhotoUpload', photoUploadSchema);
