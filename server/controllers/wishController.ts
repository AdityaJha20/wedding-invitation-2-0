import { Request, Response, NextFunction } from 'express';
import { GuestWish } from '../models/GuestWish.js';

const MAX_NAME_LENGTH = 100;
const MAX_WISH_LENGTH = 2000;

export const submitWish = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, wishes } = req.body || {};

    // Validate type
    if (typeof name !== 'string' || typeof wishes !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Please provide both your name and your blessings as valid text.',
      });
      return;
    }

    const trimmedName = name.trim();
    const trimmedWishes = wishes.trim();

    // Validate presence and empty/whitespace-only input
    if (!trimmedName || !trimmedWishes) {
      res.status(400).json({
        success: false,
        message: 'Please share both your name and your blessing.',
      });
      return;
    }

    // Validate length boundaries
    if (trimmedName.length > MAX_NAME_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
      });
      return;
    }

    if (trimmedWishes.length > MAX_WISH_LENGTH) {
      res.status(400).json({
        success: false,
        message: `Wishes must be ${MAX_WISH_LENGTH} characters or fewer.`,
      });
      return;
    }

    // Save to MongoDB guest_wishes collection
    await GuestWish.create({
      name: trimmedName,
      wishes: trimmedWishes,
    });

    res.status(201).json({
      success: true,
      message: 'Your wishes have been saved.',
    });
  } catch (error) {
    if (error && (error as any).name === 'ValidationError') {
      next(error);
      return;
    }
    // General failure
    res.status(500).json({
      success: false,
      message: 'Unable to submit your wishes.',
    });
  }
};

export const getAdminWishes = async (
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    // Newest submissions first
    const wishes = await GuestWish.find({}, { name: 1, wishes: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: wishes.length,
      wishes,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve submitted wishes.',
    });
  }
};
