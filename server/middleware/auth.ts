import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken, AdminTokenPayload } from '../utils/jwt.js';
import { Admin } from '../models/Admin.js';

export interface AuthenticatedRequest extends Request {
  admin?: AdminTokenPayload;
}

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.admin_token;

    // Optional header fallback for testing / programmatic tools
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
      return;
    }

    const decoded = verifyAdminToken(token);

    // Verify admin exists and is active in database
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      res.status(401).json({
        success: false,
        message: 'Admin account inactive or no longer exists.',
      });
      return;
    }

    req.admin = {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.',
    });
  }
};
