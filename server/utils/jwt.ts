import jwt from 'jsonwebtoken';
import { CookieOptions } from 'express';

const DEFAULT_JWT_SECRET = 'manya-sarthak-wedding-invitation-secure-jwt-secret-key-2026';

export interface AdminTokenPayload {
  id: string;
  email: string;
  role: string;
}

export const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
};

export const signAdminToken = (payload: AdminTokenPayload): string => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '24h',
  });
};

export const verifyAdminToken = (token: string): AdminTokenPayload => {
  return jwt.verify(token, getJwtSecret()) as AdminTokenPayload;
};

export const getAuthCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  };
};
