import mongoose, { Document, Schema } from 'mongoose';

export interface IGuestWish extends Document {
  name: string;
  wishes: string;
  createdAt: Date;
  updatedAt: Date;
}

const guestWishSchema = new Schema<IGuestWish>(
  {
    name: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
      minlength: [1, 'Name cannot be empty'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
      validate: {
        validator: (v: string) => v.trim().length > 0,
        message: 'Name cannot be only whitespace',
      },
    },
    wishes: {
      type: String,
      required: [true, 'Blessing/wish text is required'],
      trim: true,
      minlength: [1, 'Wishes cannot be empty'],
      maxlength: [2000, 'Wishes cannot exceed 2000 characters'],
      validate: {
        validator: (v: string) => v.trim().length > 0,
        message: 'Wishes cannot be only whitespace',
      },
    },
  },
  {
    timestamps: true,
    collection: 'guest_wishes',
  }
);

// Index to optimize querying submitted wishes newest first
guestWishSchema.index({ createdAt: -1 });

export const GuestWish = mongoose.model<IGuestWish>('GuestWish', guestWishSchema);
