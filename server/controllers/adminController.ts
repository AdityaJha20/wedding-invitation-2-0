import { Request, Response, NextFunction } from 'express';
import { Admin } from '../models/Admin.js';
import { signAdminToken, getAuthCookieOptions } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const adminLogin = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find admin by email
    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin || !admin.isActive) {
      // Intentionally uniform message to prevent account enumeration
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Verify password hash
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Sign JWT
    const token = signAdminToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    // Set secure HttpOnly cookie
    res.cookie('admin_token', token, getAuthCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Welcome back, Administrator.',
      admin: {
        email: admin.email,
        role: admin.role,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Login failed due to a server error.',
    });
  }
};

export const adminLogout = (
  _req: Request,
  res: Response
): void => {
  const cookieOptions = getAuthCookieOptions();
  // Clear the cookie immediately
  res.clearCookie('admin_token', {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

export const adminGetMe = (
  req: AuthenticatedRequest,
  res: Response
): void => {
  res.status(200).json({
    success: true,
    admin: req.admin,
  });
};
