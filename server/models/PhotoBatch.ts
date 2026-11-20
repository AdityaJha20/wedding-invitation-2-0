import mongoose, { Document, Schema } from 'mongoose';

/** One guest submission from the common QR page (up to MAX_PHOTOS_PER_BATCH photos). */
export interface IPhotoBatch extends Document {
  guestName: string;
  photoCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const photoBatchSchema = new Schema<IPhotoBatch>(
  {
    guestName: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    photoCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'photo_batches' }
);

export const PhotoBatch = mongoose.model<IPhotoBatch>('PhotoBatch', photoBatchSchema);
